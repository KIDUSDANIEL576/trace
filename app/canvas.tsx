import AsyncStorage from '@react-native-async-storage/async-storage';
import { Canvas, useCanvasRef } from '@shopify/react-native-skia';
import * as Notifications from 'expo-notifications';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackgroundSheet } from '@/components/BackgroundSheet';
import { CanvasBackdrop } from '@/components/CanvasBackdrop';
import { CanvasBoard } from '@/components/CanvasBoard';
import { CanvasDock } from '@/components/CanvasDock';
import { OpenCapsuleModal, SealCapsuleSheet } from '@/components/CapsuleSheet';
import { Glass } from '@/components/Glass';
import { HeartBloom } from '@/components/HeartBloom';
import { MoreSheet, type MoreAction } from '@/components/MoreSheet';
import { PresencePill } from '@/components/PresencePill';
import { SettingsSheet } from '@/components/SettingsSheet';
import { TraceReveal } from '@/components/TraceReveal';
import { useToast } from '@/components/Toast';
import { Loading, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useSharedCanvas } from '@/hooks/useSharedCanvas';
import { useStreak } from '@/hooks/useStreak';
import { BRUSHES } from '@/lib/brushes';
import {
  CapsuleLimitError,
  isOpen,
  listCapsules,
  openCapsule,
  opensInLabel,
  sealCapsule,
} from '@/lib/capsules';
import { notifyPartner, registerPushToken } from '@/lib/notifications';
import { deleteAccount, leaveCouple } from '@/lib/account';
import { heartbeat, notifySuccess, tapLight } from '@/lib/haptics';
import {
  createPhotoCanvas,
  PhotoCapError,
  pickPhoto,
  signedPhotoUrl,
  uploadBackgroundPhoto,
} from '@/lib/photos';
import { dailyPrompt } from '@/lib/prompts';
import { configurePurchases } from '@/lib/purchases';
import { shareCanvas } from '@/lib/shareTrace';
import { RPCS, TABLES } from '@/lib/backend';
import { refreshWidget } from '@/lib/widget';
import { supabase } from '@/lib/supabase';
import { clampBgOpacity, DEFAULT_BACKGROUND_KEY } from '@/theme/backgrounds';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, swatches, type Palette } from '@/theme/tokens';
import type { Brush, CanvasInfo, CapsuleMeta, CapsuleStroke, Membership } from '@/types';

export default function CanvasScreen() {
  const { session, loading } = useAuth();
  const { membership, loading: coupleLoading, refresh } = useCouple(session?.user.id);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  // Only block on the couple fetch before the FIRST load — background refreshes
  // (new photo canvas, partner joined) must not unmount the canvas + channel.
  if (!membership) {
    if (coupleLoading) return <Loading label="Opening your canvas…" />;
    return <Redirect href="/pair" />;
  }
  if (!membership.canvasId) return <Redirect href="/pair" />;

  return (
    <SharedCanvas
      userId={session.user.id}
      membership={membership}
      refreshMembership={refresh}
    />
  );
}

function SharedCanvas({
  userId,
  membership,
  refreshMembership,
}: {
  userId: string;
  membership: Membership;
  refreshMembership: () => Promise<void>;
}) {
  const {
    coupleId,
    canvasId: sharedCanvasId,
    displayName,
    inviteCode,
    partnerName,
    canvases,
    premium,
  } = membership;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [brush, setBrush] = useState<Brush>('marker');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [traceCount, setTraceCount] = useState<number | null>(null);
  const canvasRef = useCanvasRef();
  const [color, setColor] = useState<string>(swatches[0]);
  const [activeCanvasId, setActiveCanvasId] = useState(sharedCanvasId);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // immersive layout: the sky fills the screen; the board floats centered and
  // sizes itself to whatever room is left between the top chrome and the dock
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState({ w: 0, h: 0 });
  // Phase 5 · Time Capsules
  const [capsules, setCapsules] = useState<CapsuleMeta[]>([]);
  const [sealOpen, setSealOpen] = useState(false);
  const [viewingCapsule, setViewingCapsule] = useState<CapsuleMeta | null>(null);
  const [viewingStrokes, setViewingStrokes] = useState<CapsuleStroke[] | null>(null);
  // canvas background (the "sky"): local state so a partner's change and our
  // own optimistic pick both land instantly, without refetching the membership
  const [bgSheetOpen, setBgSheetOpen] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [bg, setBg] = useState<{ key: string; photoPath: string | null; opacity: number }>({
    key: DEFAULT_BACKGROUND_KEY,
    photoPath: null,
    opacity: 1,
  });
  const [bgPhotoUrl, setBgPhotoUrl] = useState<string | null>(null);

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);
  const activePhotoPath = activeCanvas?.photoPath ?? null;

  // Personal pages: mine (I draw, they watch) and theirs (read-only for me).
  const myPage = canvases.find((c) => c.kind === 'page' && c.ownerId === userId);
  const partnerPage = canvases.find((c) => c.kind === 'page' && c.ownerId !== userId);
  const viewingPartnerPage = activeCanvas?.kind === 'page' && activeCanvas.ownerId !== userId;
  const [pageDot, setPageDot] = useState(false); // unseen ink on their page

  const {
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
    setBackground,
    partnerPulse,
    canUndo,
  } = useSharedCanvas({
    coupleId,
    canvasId: activeCanvasId,
    userId,
    displayName,
    onCanvasNew: refreshMembership,
    onForeignInk: (cid) => {
      // she's drawing on her page while I look elsewhere → light the dot
      if (partnerPage && cid === partnerPage.id) setPageDot(true);
    },
    onCanvasBg: (p) => {
      // partner changed the sky — mirror it if it's the canvas we're looking at
      if (p.canvasId !== activeCanvasId) return;
      setBg({
        key: p.bgKey || DEFAULT_BACKGROUND_KEY,
        photoPath: p.bgPhotoPath,
        opacity: clampBgOpacity(p.bgOpacity),
      });
    },
  });

  const [bloomKey, setBloomKey] = useState(0);
  const [burst, setBurst] = useState(false);
  const homeScreenToastRef = useRef(false);
  // Mutual Heartbeat: both press within this window → the canvas erupts
  const MUTUAL_WINDOW_MS = 2500;
  const lastSentRef = useRef(0);
  const lastReceivedRef = useRef(0);

  function erupt() {
    setBurst(true);
    heartbeat();
    setTimeout(() => heartbeat(), 350); // double lub-dub — a racing heart
    notifySuccess();
    setBloomKey((k) => k + 1);
    toast.show('You pressed at the same time 💥❤️');
  }

  function sendHeartbeat() {
    heartbeat();
    sendPulse();
    notifyPartner(coupleId, 'pulse');
    lastSentRef.current = Date.now();
    if (Date.now() - lastReceivedRef.current < MUTUAL_WINDOW_MS) {
      erupt();
    } else {
      setBurst(false);
      setBloomKey((k) => k + 1);
    }
  }

  // partner sent a Heartbeat: bloom + a felt lub-dub + a soft toast —
  // and if we pressed within the same moment, erupt together
  const firstPulseRef = useRef(true);
  useEffect(() => {
    if (firstPulseRef.current) {
      firstPulseRef.current = false;
      return;
    }
    lastReceivedRef.current = Date.now();
    if (Date.now() - lastSentRef.current < MUTUAL_WINDOW_MS) {
      erupt();
      return;
    }
    setBurst(false);
    heartbeat();
    setBloomKey((k) => k + 1);
    toast.show(`${partnerName ?? partnerOnline ?? 'Your person'} is thinking of you ❤️`);
  }, [partnerPulse]); // eslint-disable-line react-hooks/exhaustive-deps

  const { streak, refresh: refreshStreak } = useStreak(coupleId);

  // capsules: load on mount and whenever the app foregrounds (a partner may
  // have sealed one, or a sealed one may have come due)
  useEffect(() => {
    listCapsules(coupleId).then(setCapsules);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') listCapsules(coupleId).then(setCapsules);
    });
    return () => sub.remove();
  }, [coupleId]);

  // make sure my page exists (idempotent RPC); announce it so their strip updates
  const ensuredPageRef = useRef(false);
  useEffect(() => {
    if (ensuredPageRef.current || myPage) return;
    ensuredPageRef.current = true;
    supabase
      .rpc(RPCS.ensureMyPage, { p_couple_id: coupleId })
      .then(async ({ data }) => {
        if (data) {
          await refreshMembership();
          announceNewCanvas(String(data));
        }
      });
  }, [coupleId, myPage, refreshMembership, announceNewCanvas]);

  // cold-open: does their page hold ink newer than what I last saw?
  useEffect(() => {
    if (!partnerPage) return;
    let stale = false;
    (async () => {
      const [{ data: latest }, seen] = await Promise.all([
        supabase
          .from(TABLES.strokes)
          .select('id')
          .eq('canvas_id', partnerPage.id)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle(),
        AsyncStorage.getItem(`trace.seen.${partnerPage.id}`),
      ]);
      if (stale || !latest) return;
      if (latest.id > Number(seen ?? 0)) setPageDot(true);
    })();
    return () => {
      stale = true;
    };
  }, [partnerPage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openPartnerPage() {
    if (!partnerPage) return;
    tapLight();
    setActiveCanvasId(partnerPage.id);
    setPageDot(false);
    const { data: latest } = await supabase
      .from(TABLES.strokes)
      .select('id')
      .eq('canvas_id', partnerPage.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) AsyncStorage.setItem(`trace.seen.${partnerPage.id}`, String(latest.id));
  }

  // A widget tap or a push lands here with ?open=partner. Their drawing should
  // ARRIVE, not just be somewhere you navigated to — so we open their page and
  // arm the full-screen reveal, which fires once the strokes have hydrated.
  const params = useLocalSearchParams<{ open?: string }>();
  const openedFromPushRef = useRef(false);
  const [revealArmed, setRevealArmed] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  useEffect(() => {
    if (params.open === 'partner' && partnerPage && !openedFromPushRef.current) {
      openedFromPushRef.current = true;
      setRevealArmed(true);
      openPartnerPage();
    }
  }, [params.open, partnerPage?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // fire the reveal only once their ink is actually on screen — an empty
  // full-screen board would be a worse moment than no moment at all
  useEffect(() => {
    if (!revealArmed) return;
    if (!viewingPartnerPage || strokes.length === 0) return;
    setRevealArmed(false);
    setRevealOpen(true);
  }, [revealArmed, viewingPartnerPage, strokes.length]);

  // if their page turns out to be empty, don't sit armed forever
  useEffect(() => {
    if (!revealArmed) return;
    const t = setTimeout(() => setRevealArmed(false), 6000);
    return () => clearTimeout(t);
  }, [revealArmed]);

  const readyCapsule = capsules.find((c) => isOpen(c) && !c.openedAt) ?? null;
  const nextSealed = capsules.find((c) => !isOpen(c)) ?? null;

  async function onSealCapsule(opensAt: Date, note: string) {
    setSealOpen(false);
    try {
      await sealCapsule(coupleId, strokes, opensAt, note);
      notifyPartner(coupleId, 'capsule');
      notifySuccess();
      toast.show(`Sealed until ${opensAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} 🎁`);
      listCapsules(coupleId).then(setCapsules);
    } catch (e) {
      if (e instanceof CapsuleLimitError) {
        // a free-tier limit, not a failure — say why, then offer the upgrade
        toast.show(e.message);
        setTimeout(() => router.push('/paywall'), 1200);
        return;
      }
      toast.show('Could not seal it — try again');
    }
  }

  async function onOpenCapsule(c: CapsuleMeta) {
    tapLight();
    const content = await openCapsule(c);
    if (!content) {
      toast.show('Not quite time yet…');
      return;
    }
    heartbeat();
    setViewingCapsule(c);
    setViewingStrokes(content);
    listCapsules(coupleId).then(setCapsules);
  }

  useEffect(() => {
    registerPushToken(userId);
    configurePurchases(userId);
  }, [userId]);

  // returning from the paywall/replay must pick up a fresh premium flag
  useFocusEffect(
    useCallback(() => {
      refreshMembership();
    }, [refreshMembership])
  );

  // keep the home-screen widgets pointed at a fresh signed snapshot URL
  useEffect(() => {
    refreshWidget(coupleId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshWidget(coupleId);
    });
    // their "left you a trace" push is the earliest signal that the snapshot
    // changed — reload the widget off the notification itself rather than
    // waiting for the next app open or the 15-30 min poll
    const push = Notifications.addNotificationReceivedListener(() => {
      refreshWidget(coupleId);
    });
    return () => {
      sub.remove();
      push.remove();
    };
  }, [coupleId]);

  // her strokes landing on a canvas I'm watching also mean a new snapshot
  useEffect(() => {
    if (!strokes.length) return;
    const t = setTimeout(() => refreshWidget(coupleId), 5000);
    return () => clearTimeout(t);
  }, [strokes.length, coupleId]);

  // adopt the stored background whenever the active canvas changes / reloads
  useEffect(() => {
    if (!activeCanvas) return;
    setBg({
      key: activeCanvas.bgKey || DEFAULT_BACKGROUND_KEY,
      photoPath: activeCanvas.bgPhotoPath,
      opacity: clampBgOpacity(activeCanvas.bgOpacity),
    });
  }, [activeCanvas?.id, activeCanvas?.bgKey, activeCanvas?.bgPhotoPath, activeCanvas?.bgOpacity]); // eslint-disable-line react-hooks/exhaustive-deps

  // sign the background photo (private bucket)
  useEffect(() => {
    setBgPhotoUrl(null);
    if (!bg.photoPath) return;
    let stale = false;
    signedPhotoUrl(bg.photoPath).then((url) => {
      if (!stale) setBgPhotoUrl(url);
    });
    return () => {
      stale = true;
    };
  }, [bg.photoPath]);

  async function applyBackground(next: {
    bgKey?: string;
    bgPhotoPath?: string | null;
    bgOpacity?: number;
  }) {
    // optimistic: the sky changes under your finger, then persists + mirrors
    const merged = {
      key: next.bgKey ?? bg.key,
      photoPath: next.bgPhotoPath !== undefined ? next.bgPhotoPath : bg.photoPath,
      opacity: next.bgOpacity ?? bg.opacity,
    };
    setBg(merged);
    try {
      await setBackground({
        bgKey: merged.key,
        bgPhotoPath: merged.photoPath,
        bgOpacity: merged.opacity,
      });
    } catch {
      toast.show('Could not save the background');
    }
  }

  async function onPickBackgroundPhoto() {
    try {
      const uri = await pickPhoto('library');
      if (!uri) return;
      setBgBusy(true);
      const path = await uploadBackgroundPhoto(coupleId, uri);
      await applyBackground({ bgPhotoPath: path });
      toast.show('Background set 🌅');
    } catch (e) {
      toast.show(e instanceof PhotoCapError ? e.message : 'Could not set that photo');
    } finally {
      setBgBusy(false);
    }
  }

  // resolve the active canvas's photo (signed URL from the private bucket)
  useEffect(() => {
    setPhotoUrl(null);
    if (activePhotoPath) {
      let stale = false;
      signedPhotoUrl(activePhotoPath).then((url) => {
        if (!stale) setPhotoUrl(url);
      });
      return () => {
        stale = true;
      };
    }
  }, [activePhotoPath]);

  // the moment the partner joins for the very first time, the canvas erupts —
  // this is the emotional peak of onboarding, not a footnote
  const partnerSeenRef = useRef(false);
  useEffect(() => {
    if (partnerOnline && !partnerSeenRef.current) {
      partnerSeenRef.current = true;
      if (!partnerName) {
        refreshMembership();
        erupt();
        toast.show(`${partnerOnline} is here — it's you two now ❤️`);
      }
    }
  }, [partnerOnline, partnerName, refreshMembership, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  function shareCode() {
    Share.share({
      message:
        `Leave me a trace ❤️\n\n` +
        `Open Trace and join our canvas with code ${inviteCode}.\n` +
        `Already have the app? Tap: trace://pair?code=${inviteCode}`,
    }).catch(() => {});
  }

  function confirmClear() {
    Alert.alert('Clear the canvas?', 'This erases it for both of you.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearCanvas() },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This is permanent. If you are the last one here, the whole canvas history goes too.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteAccount();
            if (ok) router.replace('/sign-in');
            else toast.show('Could not delete — try again');
          },
        },
      ]
    );
  }

  function onSignOut() {
    setSettingsOpen(false);
    supabase.auth.signOut().then(() => router.replace('/sign-in'));
  }

  function openSettings() {
    setSettingsOpen(true);
    // "Drawing together since … · N traces" — count fetched lazily on open
    supabase
      .from(TABLES.strokes)
      .select('id', { count: 'exact', head: true })
      .in(
        'canvas_id',
        canvases.map((c) => c.id)
      )
      .then(({ count }) => setTraceCount(count ?? null));
  }

  const coupleSince = membership.coupleSince
    ? new Date(membership.coupleSince).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;
  const settingsSubtitle = coupleSince
    ? `Drawing together since ${coupleSince}${traceCount != null ? ` · ${traceCount} traces` : ''}`
    : undefined;

  async function onShare() {
    tapLight();
    const ok = await shareCanvas(canvasRef);
    if (!ok) toast.show('Could not share right now');
  }

  function confirmLeaveCouple() {
    setSettingsOpen(false);
    Alert.alert(
      'Leave this couple?',
      partnerName
        ? `You'll be unpaired from ${partnerName}. If you're the last one here, the canvas history goes too.`
        : `If you're the last one here, the canvas history goes too.`,
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const ok = await leaveCouple();
            if (ok) {
              await refreshMembership();
              router.replace('/pair');
            } else {
              toast.show('Could not leave — try again');
            }
          },
        },
      ]
    );
  }

  function photoAllowedToday(): boolean {
    if (premium) return true;
    const todayUtc = new Date().toISOString().slice(0, 10);
    return !canvases.some((c) => c.kind === 'photo' && c.createdAt.slice(0, 10) === todayUtc);
  }

  async function addPhoto(source: 'library' | 'camera') {
    if (!photoAllowedToday()) {
      router.push('/paywall');
      return;
    }
    try {
      const uri = await pickPhoto(source);
      if (!uri) return;
      setPhotoBusy(true);
      const newId = await createPhotoCanvas(coupleId, uri);
      // announce on the still-live channel BEFORE switching tears it down
      await announceNewCanvas(newId);
      notifyPartner(coupleId, 'photo');
      await refreshMembership();
      setActiveCanvasId(newId);
      toast.show('Photo canvas ready ✏️');
    } catch (e) {
      toast.show(
        e instanceof PhotoCapError ? e.message : 'Could not add the photo — try again'
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  function onAddPhoto() {
    Alert.alert('Draw on a photo', 'Add a photo you both can draw on.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take photo', onPress: () => addPhoto('camera') },
      { text: 'Choose from library', onPress: () => addPhoto('library') },
    ]);
  }

  function openReplay() {
    router.push({
      pathname: '/replay',
      params: { canvasId: activeCanvasId, photoPath: activePhotoPath ?? '' },
    });
  }

  function chipLabel(c: CanvasInfo) {
    if (c.kind === 'shared') return 'us';
    if (c.kind === 'page') {
      return c.ownerId === userId ? '✍️ my page' : `💌 ${partnerName ?? 'their page'}`;
    }
    return new Date(c.createdAt)
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      .toLowerCase();
  }

  // strip order: us · my page · their page · photos (not raw created_at order)
  const orderedCanvases = [...canvases].sort((a, b) => {
    const rank = (c: CanvasInfo) =>
      c.kind === 'shared' ? 0 : c.kind === 'page' ? (c.ownerId === userId ? 1 : 2) : 3;
    return rank(a) - rank(b);
  });

  // the ⋯ sheet: everything that used to crowd the canvas, context-aware
  const moreActions: MoreAction[] = [];
  if (activeCanvas?.kind !== 'photo' && !viewingPartnerPage) {
    moreActions.push({
      key: 'sky',
      icon: '🌅',
      label: 'Sky & strength',
      sub: 'pick a background and how strongly it shows',
      onPress: () => setBgSheetOpen(true),
    });
  }
  moreActions.push({
    key: 'photo',
    icon: '📷',
    label: 'Draw on a photo',
    sub: 'add a photo you both can draw on',
    onPress: onAddPhoto,
  });
  moreActions.push({
    key: 'replay',
    icon: '▶️',
    label: 'Replay',
    sub: 'watch this canvas draw itself again',
    onPress: openReplay,
  });
  if (strokes.length > 0 && activeCanvas?.kind !== 'photo') {
    moreActions.push({
      key: 'capsule',
      icon: '⏳',
      label: 'Seal a time capsule',
      sub: 'hide this drawing until a future date',
      onPress: () => setSealOpen(true),
    });
  }
  if (strokes.length > 0) {
    moreActions.push({
      key: 'share',
      icon: '↗️',
      label: 'Share as image',
      onPress: onShare,
    });
  }
  if (!viewingPartnerPage) {
    moreActions.push({
      key: 'clear',
      icon: '🗑️',
      label: 'Clear the canvas',
      sub: 'erases it for both of you',
      destructive: true,
      onPress: confirmClear,
    });
  }

  // strict 1/1.1 aspect (normalized strokes must render identically on both
  // phones) fit inside whatever the stage gives us
  const boardW = stage.w > 0 ? Math.min(stage.w, stage.h / 1.1) : 0;

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setRootSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      {/* the sky fills the whole screen, dimmed so the board carries the light */}
      {rootSize.w > 0 && (
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CanvasBackdrop
            w={rootSize.w}
            h={rootSize.h}
            board={colors.board}
            bgKey={bg.key}
            bgPhotoUrl={bgPhotoUrl}
            bgOpacity={bg.opacity}
          />
        </Canvas>
      )}
      <View pointerEvents="none" style={styles.skyDim} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Pressable
              onLongPress={openSettings}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Wordmark size={24} />
            </Pressable>
            {streak > 0 && <Text style={styles.streak}>🔥 {streak}</Text>}
          </View>
          {partnerDrawing ? (
            <PresencePill name={partnerDrawing} />
          ) : partnerName || partnerOnline ? (
            <Glass radius={radius.pill} contentStyle={styles.withChip}>
              <View
                style={[
                  styles.presenceDot,
                  { backgroundColor: partnerOnline ? colors.glow : colors.muted },
                ]}
              />
              <Text style={styles.withText}>with {partnerName ?? partnerOnline}</Text>
            </Glass>
          ) : (
            <Pressable onPress={shareCode}>
              <Glass radius={radius.pill} contentStyle={styles.withChip}>
                <Text style={styles.withText}>code {inviteCode} · tap to share</Text>
              </Glass>
            </Pressable>
          )}
        </View>

        {canvases.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabStrip}
            contentContainerStyle={styles.tabStripContent}
          >
            {orderedCanvases.map((c) => {
              const on = c.id === activeCanvasId;
              const isPartnerPage = c.kind === 'page' && c.ownerId !== userId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    if (isPartnerPage) {
                      openPartnerPage();
                      return;
                    }
                    tapLight();
                    setActiveCanvasId(c.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${chipLabel(c)} canvas`}
                  style={({ pressed }) => [pressed && styles.tabPressed]}
                >
                  <Glass
                    radius={radius.pill}
                    glow={on}
                    contentStyle={styles.tab}
                    style={on && styles.tabOn}
                  >
                    <Text style={[styles.tabText, on && styles.tabTextOn]}>
                      {c.kind === 'photo' ? '📷 ' : ''}
                      {chipLabel(c)}
                    </Text>
                  </Glass>
                  {isPartnerPage && pageDot ? <View style={styles.newDot} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {connection !== 'live' && (
          <Glass radius={radius.pill} style={styles.floatPill} contentStyle={styles.floatPillPad}>
            <Text style={styles.connText}>
              {connection === 'connecting' ? 'connecting…' : 'reconnecting…'}
            </Text>
          </Glass>
        )}

        {photoBusy && (
          <Glass radius={radius.pill} style={styles.floatPill} contentStyle={styles.floatPillPad}>
            <Text style={styles.floatPillText}>adding your photo…</Text>
          </Glass>
        )}

        {readyCapsule ? (
          <Pressable
            onPress={() => onOpenCapsule(readyCapsule)}
            accessibilityRole="button"
            accessibilityLabel="A time capsule is ready — open it"
            style={({ pressed }) => [styles.floatPill, pressed && { opacity: 0.85 }]}
          >
            <Glass radius={radius.pill} glow style={styles.capsuleReady} contentStyle={styles.floatPillPad}>
              <Text style={styles.capsuleReadyText}>🎁 a time capsule is ready — tap to open</Text>
            </Glass>
          </Pressable>
        ) : nextSealed ? (
          <Glass radius={radius.pill} style={styles.floatPill} contentStyle={styles.floatPillPad}>
            <Text style={styles.floatPillText}>
              ⏳ {nextSealed.authorId === userId ? 'your' : `${partnerName ?? 'their'}`} capsule ·{' '}
              {opensInLabel(nextSealed)}
            </Text>
          </Glass>
        ) : null}

        <View
          style={styles.stage}
          onLayout={(e) =>
            setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
        >
          {boardW > 0 && (
            <View style={{ width: boardW, alignSelf: 'center' }}>
              <CanvasBoard
                strokes={strokes}
                liveStrokes={liveStrokes}
                brush={brush}
                color={color}
                brushWidth={BRUSHES[brush].width}
                photoUrl={photoUrl}
                revealInvisible={reveal}
                prompt={activeCanvas?.kind === 'photo' ? undefined : dailyPrompt()}
                readOnly={viewingPartnerPage}
                readOnlyHint={`${partnerName ?? 'they'} hasn't drawn here yet 💌`}
                seedId={activeCanvasId}
                bgKey={bg.key}
                bgPhotoUrl={bgPhotoUrl}
                bgOpacity={bg.opacity}
                canvasRef={canvasRef}
                onBegin={beginStroke}
                onPoint={addPoint}
                onEnd={(id) => {
                  endStroke(id).then(() => {
                    refreshStreak();
                    // give the server a moment to re-render, then reload the widgets
                    setTimeout(() => refreshWidget(coupleId), 5000);
                    // once per session, tie the stroke to the widget promise
                    if (!homeScreenToastRef.current && (partnerName || partnerOnline)) {
                      homeScreenToastRef.current = true;
                      setTimeout(() => toast.show('Left on their home screen ✓'), 6500);
                    }
                  });
                }}
              />
              {strokes.some((s) => s.brush === 'invisible') && (
                <Pressable
                  onPressIn={() => {
                    tapLight();
                    setReveal(true);
                  }}
                  onPressOut={() => setReveal(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Hold to reveal the invisible ink"
                  style={styles.revealChip}
                >
                  <Text style={styles.revealText}>👁 hold to reveal</Text>
                </Pressable>
              )}
              <HeartBloom trigger={bloomKey} burst={burst} />
            </View>
          )}
        </View>

        {viewingPartnerPage ? (
          <Glass radius={26} style={{ alignSelf: 'center' }} contentStyle={styles.pageCaptionWrap}>
            <Text style={styles.pageCaption}>
              💌 {partnerName ?? 'Their'} page — it appears here as they draw it
            </Text>
          </Glass>
        ) : (
          <CanvasDock
            brush={brush}
            color={color}
            premium={premium}
            canUndo={canUndo}
            onBrush={setBrush}
            onColor={setColor}
            onLockedBrush={() => router.push('/paywall')}
            onHeart={sendHeartbeat}
            onUndo={undoLast}
            onMore={() => {
              tapLight();
              setMoreOpen(true);
            }}
          />
        )}
      </View>

      <TraceReveal
        visible={revealOpen}
        authorName={partnerName ?? 'Your person'}
        strokes={strokes}
        bgKey={bg.key}
        bgPhotoUrl={bgPhotoUrl}
        bgOpacity={bg.opacity}
        photoUrl={photoUrl}
        seedId={activeCanvasId}
        onDraw={() => {
          setRevealOpen(false);
          // their page is theirs to draw on — drawing back happens on "us",
          // which is also what lands on their widget next
          setActiveCanvasId(sharedCanvasId);
        }}
      />

      <MoreSheet visible={moreOpen} actions={moreActions} onClose={() => setMoreOpen(false)} />

      <BackgroundSheet
        visible={bgSheetOpen}
        bgKey={bg.key}
        bgOpacity={bg.opacity}
        hasCustomPhoto={bg.photoPath != null}
        busy={bgBusy}
        premium={premium}
        onClose={() => setBgSheetOpen(false)}
        onPick={(key) => applyBackground({ bgKey: key, bgPhotoPath: null })}
        onOpacity={(v) => applyBackground({ bgOpacity: v })}
        onPickPhoto={onPickBackgroundPhoto}
        onClearPhoto={() => applyBackground({ bgPhotoPath: null })}
        onLocked={() => {
          setBgSheetOpen(false);
          router.push('/paywall');
        }}
      />

      <SealCapsuleSheet
        visible={sealOpen}
        strokeCount={strokes.length}
        premium={premium}
        onClose={() => setSealOpen(false)}
        onSeal={onSealCapsule}
        onLocked={() => {
          setSealOpen(false);
          router.push('/paywall');
        }}
      />
      <OpenCapsuleModal
        capsule={viewingCapsule}
        strokes={viewingStrokes}
        authorName={
          viewingCapsule?.authorId === userId ? 'you' : (partnerName ?? 'your person')
        }
        onClose={() => {
          setViewingCapsule(null);
          setViewingStrokes(null);
        }}
      />

      <SettingsSheet
        visible={settingsOpen}
        subtitle={settingsSubtitle}
        onClose={() => setSettingsOpen(false)}
        onSignOut={onSignOut}
        onLeaveCouple={confirmLeaveCouple}
        onDelete={() => {
          setSettingsOpen(false);
          confirmDeleteAccount();
        }}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.night },
    // the board carries the light; the full-screen sky sits back ~35%
    skyDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    content: { flex: 1, paddingHorizontal: 14 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 8,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    streak: {
      color: colors.goldText,
      fontSize: 13,
      fontWeight: '700',
      overflow: 'hidden',
      backgroundColor: 'rgba(244,198,107,0.14)',
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    withChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 7,
      paddingHorizontal: 13,
    },
    withText: { color: colors.onOverlay, fontSize: 12.5 },
    presenceDot: { width: 8, height: 8, borderRadius: 4 },
    tabStrip: { flexGrow: 0, marginBottom: 4 },
    tabStripContent: { gap: 8, paddingVertical: 2 },
    tab: { paddingVertical: 9, paddingHorizontal: 17 },
    tabOn: {
      shadowColor: colors.ink,
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 },
      elevation: 8,
    },
    tabPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    tabText: { color: colors.onOverlay, fontSize: 13.5, fontWeight: '500' },
    tabTextOn: { color: '#ffb9c2' },
    newDot: {
      position: 'absolute',
      top: 3,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.ink,
    },
    floatPill: { alignSelf: 'center', marginTop: 7 },
    floatPillPad: { paddingVertical: 6, paddingHorizontal: 15 },
    floatPillText: { color: colors.onOverlay, fontSize: 12 },
    connText: { color: '#ffb9c2', fontSize: 12, fontWeight: '500' },
    capsuleReady: {
      shadowColor: colors.gold,
      shadowOpacity: 0.55,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 3 },
      elevation: 9,
    },
    capsuleReadyText: { color: colors.gold, fontSize: 12.5, fontWeight: '600' },
    stage: { flex: 1, justifyContent: 'center', marginVertical: 8 },
    pageCaptionWrap: {
      alignSelf: 'center',
      backgroundColor: colors.overlay,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      borderRadius: 24,
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    pageCaption: { color: colors.onOverlay, fontSize: 13.5, textAlign: 'center' },
    revealChip: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      backgroundColor: 'rgba(10,9,13,0.62)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    revealText: { color: '#ffffff', fontSize: 12.5, fontWeight: '500' },
  });
