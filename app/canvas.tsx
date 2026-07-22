import { Redirect, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanvasBoard } from '@/components/CanvasBoard';
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
import { notifyPartner, registerPushToken } from '@/lib/notifications';
import { deleteAccount } from '@/lib/account';
import { heartbeat, notifySuccess, tapLight } from '@/lib/haptics';
import { createPhotoCanvas, pickPhoto, signedPhotoUrl } from '@/lib/photos';
import { configurePurchases } from '@/lib/purchases';
import { refreshWidget } from '@/lib/widget';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, swatches, type Palette } from '@/theme/tokens';
import type { Brush, CanvasInfo, Membership } from '@/types';

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
  const [color, setColor] = useState<string>(swatches[0]);
  const [activeCanvasId, setActiveCanvasId] = useState(sharedCanvasId);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [reveal, setReveal] = useState(false);

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

  function sendHeartbeat() {
    heartbeat();
    sendPulse();
    notifyPartner(coupleId, 'pulse');
    setBloomKey((k) => k + 1);
  }

  // partner sent a Heartbeat: bloom + a felt lub-dub + a soft toast
  const firstPulseRef = useRef(true);
  useEffect(() => {
    if (firstPulseRef.current) {
      firstPulseRef.current = false;
      return;
    }
    heartbeat();
    setBloomKey((k) => k + 1);
    toast.show(`${partnerName ?? partnerOnline ?? 'Your person'} is thinking of you ❤️`);
  }, [partnerPulse]); // eslint-disable-line react-hooks/exhaustive-deps

  const { streak, refresh: refreshStreak } = useStreak(coupleId);

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

  // the moment the partner first shows up, celebrate + load their name
  const partnerSeenRef = useRef(false);
  useEffect(() => {
    if (partnerOnline && !partnerSeenRef.current) {
      partnerSeenRef.current = true;
      if (!partnerName) {
        notifySuccess();
        refreshMembership();
        toast.show(`${partnerOnline} is here — say hi ✏️`);
      }
    }
  }, [partnerOnline, partnerName, refreshMembership, toast]);

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
            onLongPress={() => setSettingsOpen(true)}
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

      <View>
        <CanvasBoard
          strokes={strokes}
          liveStrokes={liveStrokes}
          brush={brush}
          color={color}
          brushWidth={BRUSHES[brush].width}
          photoUrl={photoUrl}
          revealInvisible={reveal}
          onBegin={beginStroke}
          onPoint={addPoint}
          onEnd={(id) => {
            endStroke(id).then(() => {
              refreshStreak();
              // give the server a moment to re-render, then reload the widgets
              setTimeout(() => refreshWidget(coupleId), 5000);
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
        <HeartBloom trigger={bloomKey} />
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

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignOut={onSignOut}
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
