import { useCanvasRef } from '@shopify/react-native-skia';
import { Redirect, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanvasBoard } from '@/components/CanvasBoard';
import { OpenCapsuleModal, SealCapsuleSheet } from '@/components/CapsuleSheet';
import { HeartBloom } from '@/components/HeartBloom';
import { PresencePill } from '@/components/PresencePill';
import { SettingsSheet } from '@/components/SettingsSheet';
import { useToast } from '@/components/Toast';
import { Toolbar } from '@/components/Toolbar';
import { Button, Loading, Screen, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useSharedCanvas } from '@/hooks/useSharedCanvas';
import { useStreak } from '@/hooks/useStreak';
import { BRUSHES } from '@/lib/brushes';
import { isOpen, listCapsules, openCapsule, opensInLabel, sealCapsule } from '@/lib/capsules';
import { notifyPartner, registerPushToken } from '@/lib/notifications';
import { deleteAccount, leaveCouple } from '@/lib/account';
import { heartbeat, notifySuccess, tapLight } from '@/lib/haptics';
import { createPhotoCanvas, pickPhoto, signedPhotoUrl } from '@/lib/photos';
import { dailyPrompt } from '@/lib/prompts';
import { configurePurchases } from '@/lib/purchases';
import { shareCanvas } from '@/lib/shareTrace';
import { TABLES } from '@/lib/backend';
import { refreshWidget } from '@/lib/widget';
import { supabase } from '@/lib/supabase';
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
  // Phase 5 · Time Capsules
  const [capsules, setCapsules] = useState<CapsuleMeta[]>([]);
  const [sealOpen, setSealOpen] = useState(false);
  const [viewingCapsule, setViewingCapsule] = useState<CapsuleMeta | null>(null);
  const [viewingStrokes, setViewingStrokes] = useState<CapsuleStroke[] | null>(null);

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);
  const activePhotoPath = activeCanvas?.photoPath ?? null;

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
    partnerPulse,
    canUndo,
  } = useSharedCanvas({
    coupleId,
    canvasId: activeCanvasId,
    userId,
    displayName,
    onCanvasNew: refreshMembership,
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

  const readyCapsule = capsules.find((c) => isOpen(c) && !c.openedAt) ?? null;
  const nextSealed = capsules.find((c) => !isOpen(c)) ?? null;

  async function onSealCapsule(opensAt: Date, note: string) {
    setSealOpen(false);
    try {
      await sealCapsule(coupleId, userId, strokes, opensAt, note);
      notifySuccess();
      toast.show(`Sealed until ${opensAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} 🎁`);
      listCapsules(coupleId).then(setCapsules);
    } catch {
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
    return () => sub.remove();
  }, [coupleId]);

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
      message: `Leave me a trace ❤️ Get the Trace app and join our canvas with code ${inviteCode}`,
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
    } catch {
      toast.show('Could not add the photo — try again');
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
    if (c.kind === 'shared') return 'our canvas';
    return new Date(c.createdAt)
      .toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      .toLowerCase();
  }

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.brandRow}>
          <Pressable
            onLongPress={openSettings}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Wordmark />
          </Pressable>
          {streak > 0 && <Text style={styles.streak}>🔥 {streak}</Text>}
        </View>
        {partnerDrawing ? (
          <PresencePill name={partnerDrawing} />
        ) : partnerName || partnerOnline ? (
          <View style={styles.withRow}>
            <View
              style={[
                styles.presenceDot,
                { backgroundColor: partnerOnline ? colors.glow : colors.muted },
              ]}
            />
            <Text style={styles.partner}>with {partnerName ?? partnerOnline}</Text>
          </View>
        ) : (
          <Pressable style={styles.codeChip} onPress={shareCode}>
            <Text style={styles.codeChipText}>code {inviteCode} · tap to share</Text>
          </Pressable>
        )}
      </View>

      {connection !== 'live' && (
        <View style={styles.connBanner}>
          <Text style={styles.connText}>
            {connection === 'connecting' ? 'connecting…' : 'reconnecting…'}
          </Text>
        </View>
      )}

      {canvases.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipStrip}
          contentContainerStyle={styles.chipStripContent}
        >
          {canvases.map((c) => {
            const on = c.id === activeCanvasId;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  tapLight();
                  setActiveCanvasId(c.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${chipLabel(c)} canvas`}
                style={({ pressed }) => [
                  styles.chip,
                  on && styles.chipOn,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {c.kind === 'photo' ? '📷 ' : ''}
                  {chipLabel(c)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {readyCapsule ? (
        <Pressable
          onPress={() => onOpenCapsule(readyCapsule)}
          accessibilityRole="button"
          accessibilityLabel="A time capsule is ready — open it"
          style={({ pressed }) => [styles.capsulePill, styles.capsulePillReady, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.capsuleReadyText}>🎁 a time capsule is ready — tap to open</Text>
        </Pressable>
      ) : nextSealed ? (
        <View style={styles.capsulePill}>
          <Text style={styles.capsuleText}>
            ⏳ {nextSealed.authorId === userId ? 'your' : `${partnerName ?? 'their'}`} capsule ·{' '}
            {opensInLabel(nextSealed)}
          </Text>
        </View>
      ) : null}

      <View>
        <CanvasBoard
          strokes={strokes}
          liveStrokes={liveStrokes}
          brush={brush}
          color={color}
          brushWidth={BRUSHES[brush].width}
          photoUrl={photoUrl}
          revealInvisible={reveal}
          prompt={activeCanvas?.kind === 'photo' ? undefined : dailyPrompt()}
          seedId={activeCanvasId}
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
        {strokes.length > 0 && (
          <Pressable
            onPress={onShare}
            accessibilityRole="button"
            accessibilityLabel="Share this canvas as an image"
            style={({ pressed }) => [styles.shareChip, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.revealText}>↗ share</Text>
          </Pressable>
        )}
        {strokes.length > 0 && (
          <Pressable
            onPress={() => {
              tapLight();
              setSealOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Seal this drawing in a time capsule"
            style={({ pressed }) => [styles.capsuleChip, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.revealText}>⏳ capsule</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={sendHeartbeat}
        accessibilityRole="button"
        accessibilityLabel="Send a heartbeat"
        style={({ pressed }) => [styles.heartBtn, pressed && styles.heartBtnPressed]}
      >
        <Text style={styles.heartBtnText}>❤  Send a heartbeat</Text>
      </Pressable>

      <Toolbar
        brush={brush}
        color={color}
        premium={premium}
        onBrush={setBrush}
        onColor={setColor}
        onLockedBrush={() => router.push('/paywall')}
      />

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button title="Clear" variant="ghost" onPress={confirmClear} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="↺ Undo" variant="ghost" onPress={undoLast} disabled={!canUndo} />
        </View>
      </View>
      <View style={styles.actionsBottom}>
        <View style={{ flex: 1 }}>
          <Button title="＋ Photo" variant="ghost" onPress={onAddPhoto} loading={photoBusy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="▶ Replay" variant="ghost" onPress={openReplay} />
        </View>
      </View>

      <SealCapsuleSheet
        visible={sealOpen}
        strokeCount={strokes.length}
        onClose={() => setSealOpen(false)}
        onSeal={onSealCapsule}
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
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streak: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
    backgroundColor: 'rgba(244,198,107,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  withRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  presenceDot: { width: 8, height: 8, borderRadius: 4 },
  partner: { color: colors.muted, fontSize: 13 },
  codeChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  codeChipText: { color: colors.muted, fontSize: 12 },
  connBanner: {
    alignSelf: 'center',
    backgroundColor: colors.inkSoft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  connText: { color: '#ffb9c2', fontSize: 12, fontWeight: '500' },
  chipStrip: { flexGrow: 0, marginBottom: 10 },
  chipStripContent: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 13,
  },
  chipOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
  chipPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  chipText: { color: colors.muted, fontSize: 12.5, fontWeight: '500' },
  chipTextOn: { color: '#ffb9c2' },
  heartBtn: {
    marginTop: 14,
    minHeight: 50,
    borderRadius: radius.button,
    backgroundColor: colors.inkSoft,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  heartBtnText: { color: colors.ink, fontSize: 15.5, fontWeight: '700', letterSpacing: 0.2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionsBottom: { flexDirection: 'row', gap: 8, marginTop: 8 },
  shareChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(10,9,13,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  capsulePill: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  capsulePillReady: { borderColor: colors.gold, backgroundColor: 'rgba(244,198,107,0.14)' },
  capsuleText: { color: colors.muted, fontSize: 12 },
  capsuleReadyText: { color: colors.gold, fontSize: 12.5, fontWeight: '600' },
  capsuleChip: {
    position: 'absolute',
    bottom: 12,
    left: 86,
    backgroundColor: 'rgba(10,9,13,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
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
