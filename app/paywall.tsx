import { Redirect, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { Button, Loading, Screen, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import {
  foreverPrice,
  purchaseForever,
  purchasesAvailable,
  restoreForever,
} from '@/lib/purchases';
import { colors, fonts, radius } from '@/theme/tokens';

const PERKS = [
  ['🖊', 'All brushes — glow, neon, and invisible ink'],
  ['📷', 'Unlimited photo canvases'],
  ['⏪', 'Full Relationship Replay, from stroke one'],
] as const;

/** Trace Forever: one purchase, both partners unlocked — forever. */
export default function Paywall() {
  const { session, loading } = useAuth();
  const { membership, refresh } = useCouple(session?.user.id);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [price, setPrice] = useState('$29.99');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    foreverPrice().then(setPrice);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // once premium lands (webhook → couples.premium), celebrate and leave
  useEffect(() => {
    if (membership?.premium) {
      if (pollRef.current) clearInterval(pollRef.current);
      toast.show('Trace Forever unlocked for you both ❤️');
      router.back();
    }
  }, [membership?.premium, toast]);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;

  function pollForUnlock() {
    // the webhook usually lands within seconds of the store confirming
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => refresh(), 2000);
  }

  async function onBuy() {
    if (!purchasesAvailable()) {
      toast.show('Purchases need a store build with RevenueCat keys');
      return;
    }
    setBusy('buy');
    const ok = await purchaseForever();
    setBusy(null);
    if (ok) pollForUnlock();
  }

  async function onRestore() {
    if (!purchasesAvailable()) {
      toast.show('Purchases need a store build with RevenueCat keys');
      return;
    }
    setBusy('restore');
    const ok = await restoreForever();
    setBusy(null);
    if (ok) pollForUnlock();
    else toast.show('No previous purchase found');
  }

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Wordmark />
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>Not now</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.h1}>
          Trace <Text style={{ color: colors.ink }}>Forever.</Text>
        </Text>
        <Text style={styles.sub}>
          One purchase. Both of you, unlocked — forever. No subscription.
        </Text>

        <View style={styles.card}>
          {PERKS.map(([icon, text]) => (
            <View key={text} style={styles.perk}>
              <Text style={styles.perkIcon}>{icon}</Text>
              <Text style={styles.perkText}>{text}</Text>
            </View>
          ))}
          <View style={styles.perk}>
            <Text style={styles.perkIcon}>💞</Text>
            <Text style={styles.perkText}>Unlocks for your person too, automatically</Text>
          </View>
        </View>

        <Button title={`Unlock for ${price}`} onPress={onBuy} loading={busy === 'buy'} />
        <View style={{ height: 10 }} />
        <Button
          title="Restore purchase"
          variant="ghost"
          onPress={onRestore}
          loading={busy === 'restore'}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  close: { padding: 8 },
  closeText: { color: colors.muted, fontSize: 14.5 },
  center: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  h1: { fontFamily: fonts.handwriting, fontSize: 52, lineHeight: 56, color: colors.text },
  sub: { color: colors.muted, fontSize: 15.5, marginTop: 8, marginBottom: 22 },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 20,
    gap: 14,
    marginBottom: 24,
  },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkIcon: { fontSize: 18 },
  perkText: { color: colors.text, fontSize: 14.5, flex: 1 },
});
