import type { RealtimeChannel } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { coupleChannel, TABLES } from '@/lib/backend';
import { supabase } from '@/lib/supabase';
import { notifyPartner } from '@/lib/notifications';
import { requestSnapshot } from '@/lib/snapshots';
import type {
  Brush,
  CanvasClearPayload,
  CanvasNewPayload,
  Point,
  PresenceState,
  Stroke,
  StrokeEndPayload,
  StrokePointsPayload,
  StrokeStartPayload,
  StrokeUndoPayload,
} from '@/types';

const POINT_BATCH_MS = 50; // spec: batch in-flight points every ~50ms
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export type ConnectionState = 'connecting' | 'live' | 'reconnecting';

interface Args {
  coupleId: string;
  canvasId: string;
  userId: string;
  displayName: string;
  onCanvasNew?: () => void;
}

/**
 * Owns everything on the shared canvas:
 * - rehydration from the strokes table on mount AND on every reconnect
 *   (missed broadcasts are recovered from persistence)
 * - Broadcast (not postgres_changes) for in-flight strokes: start/points/end
 * - Presence → partner online + "…is drawing" pill
 * - auto-reconnect with exponential backoff; refetch on app foreground
 * - persistence on stroke end, daily mark, throttled partner push
 * - undo-own-stroke and clear, mirrored to the partner via broadcast
 */
export function useSharedCanvas({ coupleId, canvasId, userId, displayName, onCanvasNew }: Args) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStrokes, setLiveStrokes] = useState<Record<string, Stroke>>({});
  const [partnerDrawing, setPartnerDrawing] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [partnerPulse, setPartnerPulse] = useState(0); // ticks when partner sends a Heartbeat

  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);
  // Mirror of liveStrokes so the stroke:end handler can read the finished
  // stroke synchronously — state updaters run in hook order, not call order,
  // so capturing across two updaters would lose the partner's stroke.
  const liveStrokesRef = useRef<Record<string, Stroke>>({});
  liveStrokesRef.current = liveStrokes; // re-synced every render, before any handler can fire
  const strokeCanvasRef = useRef(canvasId); // canvas the in-flight stroke belongs to
  const canvasIdRef = useRef(canvasId); // guards late refetches after a switch
  const pendingPointsRef = useRef<Point[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ref so a changing callback doesn't tear down the channel subscription
  const onCanvasNewRef = useRef(onCanvasNew);
  onCanvasNewRef.current = onCanvasNew;

  const send = useCallback((event: string, payload: unknown) => {
    return channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const trackPresence = useCallback(
    (drawing: boolean) => {
      const state: PresenceState = { userId, name: displayName, drawing };
      channelRef.current?.track(state);
    },
    [userId, displayName]
  );

  /** Loads persisted strokes, keeping any local strokes that never persisted. */
  const refetchStrokes = useCallback(async () => {
    const { data, error } = await supabase
      .from(TABLES.strokes)
      .select('id, author_id, brush, color, width, points, created_at')
      .eq('canvas_id', canvasId)
      .order('id', { ascending: true });
    if (error || !data) return;
    const fromDb: Stroke[] = data.map((row) => ({
      id: `db-${row.id}`,
      dbId: row.id,
      authorId: row.author_id,
      brush: row.brush as Brush,
      color: row.color,
      width: row.width,
      points: row.points as Point[],
      createdAt: row.created_at ? Date.parse(row.created_at) : undefined,
    }));
    setStrokes((prev) => {
      // a slow SELECT for a canvas we've since switched away from must not land
      if (canvasIdRef.current !== canvasId) return prev;
      const unpersisted = prev.filter((s) => s.dbId == null);
      return [...fromDb, ...unpersisted];
    });
  }, [canvasId]);

  // ---- realtime subscription with auto-reconnect ----
  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // fresh canvas, fresh state — never leak strokes across canvases
    canvasIdRef.current = canvasId;
    setStrokes([]);
    setLiveStrokes({});

    function connect() {
      if (disposed) return;

      const channel = supabase.channel(coupleChannel(coupleId), {
        config: { private: true, broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'stroke:start' }, ({ payload }) => {
          const p = payload as StrokeStartPayload;
          if (p.canvasId !== canvasId) return; // partner is drawing on another canvas
          setLiveStrokes((prev) => ({
            ...prev,
            [p.strokeId]: {
              id: p.strokeId,
              authorId: p.authorId,
              brush: p.brush,
              color: p.color,
              width: p.width,
              points: [],
            },
          }));
        })
        .on('broadcast', { event: 'stroke:points' }, ({ payload }) => {
          const p = payload as StrokePointsPayload;
          setLiveStrokes((prev) => {
            const s = prev[p.strokeId];
            if (!s) return prev;
            return { ...prev, [p.strokeId]: { ...s, points: [...s.points, ...p.pts] } };
          });
        })
        .on('broadcast', { event: 'stroke:end' }, ({ payload }) => {
          const p = payload as StrokeEndPayload;
          // Read the finished stroke from the ref, synchronously, BEFORE any
          // setState. Capturing it inside one updater and reading it from a
          // sibling updater would fail: React runs updaters in hook-declaration
          // order (strokes before liveStrokes), so the promote would see null
          // and the partner's stroke would vanish on finger-lift.
          const s = liveStrokesRef.current[p.strokeId];
          if (s) {
            const ended: Stroke = { ...s, dbId: p.dbId ?? undefined, createdAt: Date.now() };
            setStrokes((list) => (list.some((x) => x.id === ended.id) ? list : [...list, ended]));
            setLiveStrokes((prev) => {
              if (!prev[p.strokeId]) return prev;
              const { [p.strokeId]: _done, ...rest } = prev;
              return rest;
            });
          }
          // feel the partner's stroke land
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        })
        .on('broadcast', { event: 'stroke:undo' }, ({ payload }) => {
          const p = payload as StrokeUndoPayload;
          setStrokes((list) =>
            list.filter((s) => s.id !== p.strokeId && (p.dbId == null || s.dbId !== p.dbId))
          );
        })
        .on('broadcast', { event: 'canvas:clear' }, ({ payload }) => {
          const p = payload as CanvasClearPayload;
          if (p.canvasId !== canvasId) return;
          setStrokes([]);
          setLiveStrokes({});
        })
        .on('broadcast', { event: 'canvas:new' }, () => {
          onCanvasNewRef.current?.();
        })
        .on('broadcast', { event: 'pulse' }, () => {
          setPartnerPulse((n) => n + 1);
        })
        .on('presence', { event: 'sync' }, () => {
          const entries = Object.values(channel.presenceState<PresenceState>()).flat();
          const partner = entries.find((s) => s.userId !== userId);
          setPartnerOnline(partner ? partner.name : null);
          setPartnerDrawing(partner && partner.drawing ? partner.name : null);
        })
        .subscribe((status) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            attempt = 0;
            setConnection('live');
            channel.track({ userId, name: displayName, drawing: false } satisfies PresenceState);
            // recover anything broadcast while we were away
            refetchStrokes();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnection('reconnecting');
            setPartnerOnline(null);
            setPartnerDrawing(null);
            supabase.removeChannel(channel);
            if (channelRef.current === channel) channelRef.current = null;
            const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
            attempt += 1;
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(connect, delay);
          }
        });

      channelRef.current = channel;
    }

    connect();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchStrokes();
    });

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      appState.remove();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [coupleId, canvasId, userId, displayName, refetchStrokes]);

  // ---- local drawing ----
  const beginStroke = useCallback(
    (brush: Brush, color: string, width: number): string => {
      const strokeId = Crypto.randomUUID();
      const stroke: Stroke = { id: strokeId, authorId: userId, brush, color, width, points: [] };
      currentStrokeRef.current = stroke;
      strokeCanvasRef.current = canvasId; // in case the user switches mid-stroke
      pendingPointsRef.current = [];
      // state gets its OWN copy — the ref copy is mutated for persistence only
      setLiveStrokes((prev) => ({ ...prev, [strokeId]: { ...stroke, points: [] } }));
      send('stroke:start', {
        strokeId,
        canvasId,
        authorId: userId,
        brush,
        color,
        width,
      } satisfies StrokeStartPayload);
      trackPresence(true);

      // an overlapping stroke (multi-touch, palm rest) must not leak the prior
      // interval — it would keep draining the shared point buffer forever
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushTimerRef.current = setInterval(() => {
        const pts = pendingPointsRef.current;
        if (!pts.length) return;
        pendingPointsRef.current = [];
        send('stroke:points', { strokeId, pts } satisfies StrokePointsPayload);
      }, POINT_BATCH_MS);

      return strokeId;
    },
    [canvasId, send, trackPresence, userId]
  );

  const addPoint = useCallback((strokeId: string, pt: Point) => {
    pendingPointsRef.current.push(pt);
    const cur = currentStrokeRef.current;
    if (cur && cur.id === strokeId) cur.points.push(pt);
    setLiveStrokes((prev) => {
      const s = prev[strokeId];
      if (!s) return prev;
      return { ...prev, [strokeId]: { ...s, points: [...s.points, pt] } };
    });
  }, []);

  const endStroke = useCallback(
    async (strokeId: string) => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // flush any tail points before ending
      const tail = pendingPointsRef.current;
      pendingPointsRef.current = [];
      if (tail.length) send('stroke:points', { strokeId, pts: tail } satisfies StrokePointsPayload);
      trackPresence(false);

      const finished = currentStrokeRef.current;
      currentStrokeRef.current = null;
      if (!finished || finished.id !== strokeId || finished.points.length < 2) {
        setLiveStrokes((prev) => {
          const { [strokeId]: _drop, ...rest } = prev;
          return rest;
        });
        send('stroke:end', { strokeId, dbId: null } satisfies StrokeEndPayload);
        return;
      }

      // persist, then broadcast end with the row id so both sides can undo it later
      // (to the canvas the stroke STARTED on, even if the user switched mid-stroke)
      const strokeCanvasId = strokeCanvasRef.current;
      let dbId: number | null = null;
      try {
        const { data } = await supabase
          .from(TABLES.strokes)
          .insert({
            canvas_id: strokeCanvasId,
            author_id: userId,
            brush: finished.brush,
            color: finished.color,
            width: finished.width,
            points: finished.points,
          })
          .select('id')
          .single();
        dbId = data?.id ?? null;
      } catch {
        // keep the stroke locally even if persistence failed
      }
      send('stroke:end', { strokeId, dbId } satisfies StrokeEndPayload);

      setLiveStrokes((prev) => {
        const { [strokeId]: _done, ...rest } = prev;
        return rest;
      });
      // only promote into the visible list if we're still on that canvas
      if (strokeCanvasId === canvasIdRef.current) {
        const promotedAt = Date.now(); // outside the updater — updaters stay pure
        setStrokes((list) => [
          ...list,
          { ...finished!, dbId: dbId ?? undefined, createdAt: promotedAt },
        ]);
      }

      // streak mark lands before we resolve, so the caller's refresh sees it
      const today = new Date().toISOString().slice(0, 10);
      try {
        await supabase
          .from(TABLES.dailyMarks)
          .upsert(
            { couple_id: coupleId, day: today, user_id: userId },
            { onConflict: 'couple_id,day,user_id', ignoreDuplicates: true }
          );
      } catch {
        // best-effort
      }
      notifyPartner(coupleId);
      requestSnapshot(coupleId); // keep the widget PNG fresh
    },
    [coupleId, send, trackPresence, userId]
  );

  // ---- undo own last stroke ----
  const undoLast = useCallback(async () => {
    const mine = [...strokes].reverse().find((s) => s.authorId === userId);
    if (!mine) return;
    setStrokes((list) => list.filter((s) => s.id !== mine.id));
    send('stroke:undo', { strokeId: mine.id, dbId: mine.dbId ?? null } satisfies StrokeUndoPayload);
    if (mine.dbId != null) {
      await supabase.from(TABLES.strokes).delete().eq('id', mine.dbId);
    }
    requestSnapshot(coupleId);
  }, [coupleId, send, strokes, userId]);

  // ---- clear the whole canvas ----
  const clearCanvas = useCallback(async () => {
    setStrokes([]);
    setLiveStrokes({});
    send('canvas:clear', { canvasId } satisfies CanvasClearPayload);
    await supabase.from(TABLES.strokes).delete().eq('canvas_id', canvasId);
    requestSnapshot(coupleId);
  }, [canvasId, coupleId, send]);

  // ---- tell the partner a new (photo) canvas exists ----
  // awaited so the send flushes before the caller switches canvas (channel teardown)
  const announceNewCanvas = useCallback(
    async (newCanvasId: string) => {
      await send('canvas:new', { canvasId: newCanvasId } satisfies CanvasNewPayload);
    },
    [send]
  );

  // ---- send a Heartbeat to the partner (ephemeral, not persisted) ----
  const sendPulse = useCallback(() => {
    send('pulse', {});
  }, [send]);

  return {
    strokes,
    liveStrokes,
    partnerDrawing,
    partnerOnline,
    connection,
    beginStroke,
    addPoint,
    endStroke,
    undoLast,
    clearCanvas,
    announceNewCanvas,
    sendPulse,
    partnerPulse,
    canUndo: strokes.some((s) => s.authorId === userId),
  };
}
