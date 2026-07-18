import { Redirect, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanvasBoard } from '@/components/CanvasBoard';
import { PresencePill } from '@/components/PresencePill';
import { useToast } from '@/components/Toast';
import { Toolbar } from '@/components/Toolbar';
import { Button, Loading, Screen, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useSharedCanvas } from '@/hooks/useSharedCanvas';
import { BRUSHES } from '@/lib/brushes';
import { registerPushToken } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { colors, radius, swatches } from '@/theme/tokens';
import type { Brush } from '@/types';

export default function CanvasScreen() {
  const { session, loading } = useAuth();
  const { membership, loading: coupleLoading, refresh } = useCouple(session?.user.id);

  if (loading || coupleLoading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!membership || !membership.canvasId) return <Redirect href="/pair" />;

  return (
    <SharedCanvas
      userId={session.user.id}
      coupleId={membership.coupleId}
      canvasId={membership.canvasId}
      displayName={membership.displayName}
      inviteCode={membership.inviteCode}
      partnerName={membership.partnerName}
      refreshMembership={refresh}
    />
  );
}

function SharedCanvas({
  userId,
  coupleId,
  canvasId,
  displayName,
  inviteCode,
  partnerName,
  refreshMembership,
}: {
  userId: string;
  coupleId: string;
  canvasId: string;
  displayName: string;
  inviteCode: string;
  partnerName: string | null;
  refreshMembership: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [brush, setBrush] = useState<Brush>('marker');
  const [color, setColor] = useState<string>(swatches[0]);

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
    canUndo,
  } = useSharedCanvas({ coupleId, canvasId, userId, displayName });

  useEffect(() => {
    registerPushToken(userId);
  }, [userId]);

  // the moment the partner first shows up, celebrate + load their name
  const partnerSeenRef = useRef(false);
  useEffect(() => {
    if (partnerOnline && !partnerSeenRef.current) {
      partnerSeenRef.current = true;
      if (!partnerName) {
        refreshMembership();
        toast.show(`${partnerOnline} is here ✏️`);
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

  function onWordmarkLongPress() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => supabase.auth.signOut().then(() => router.replace('/sign-in')),
      },
    ]);
  }

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onLongPress={onWordmarkLongPress}>
          <Wordmark />
        </Pressable>
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

      <CanvasBoard
        strokes={strokes}
        liveStrokes={liveStrokes}
        brush={brush}
        color={color}
        brushWidth={BRUSHES[brush].width}
        onBegin={beginStroke}
        onPoint={addPoint}
        onEnd={endStroke}
      />

      <Toolbar brush={brush} color={color} onBrush={setBrush} onColor={setColor} />

      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button title="Clear" variant="ghost" onPress={confirmClear} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="↺ Undo" variant="ghost" onPress={undoLast} disabled={!canUndo} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
