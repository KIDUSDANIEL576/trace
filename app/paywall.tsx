import { Redirect, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { Button, Loading, Screen, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { notifySuccess } from '@/lib/haptics';
import {
  foreverPrice,
  purchaseForever,
  purchasesAvailable,
  restoreForever,
} from '@/lib/purchases';
import { colors, fonts, radius } from '@/theme/tokens';

const PERKS = [
  ['🖊', 'Every brush', 'Glow, neon, and invisible ink'],
  ['📷', 'Unlimited photos', 'Draw on as many as you like'],
  ['⏪', 'Full replay', 'Relive every stroke, from the first'],
  ['💞', 'Unlocks for both', 'One buys it — you both get it, forever'],
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
      notifySuccess();
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
        <Text style={styles.sub}>Everything unlocked, for both of you — forever.</Text>

        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ONE-TIME · NO SUBSCRIPTION</Text>
          </View>
          {PERKS.map(([icon, title, desc]) => (
            <View key={title} style={styles.perk}>
              <Text style={styles.perkIcon}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.perkTitle}>{title}</Text>
                <Text style={styles.perkDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Button title={`Unlock for ${price}`} onPress={onBuy} loading={busy === 'buy'} />
        <Text style={styles.oneTime}>One payment. Yours to keep, on every device.</Text>
        <Pressable
          onPress={onRestore}
          disabled={busy === 'restore'}
          style={styles.restore}
          accessibilityRole="button"
          accessibilityLabel="Restore purchase"
        >
          <Text style={styles.restoreText}>Already bought it? Restore purchase</Text>
        </Pressable>
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
  sub: { color: colors.muted, fontSize: 15.5, marginTop: 8, marginBottom: 24 },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: 'rgba(244,198,107,0.35)',
    borderRadius: radius.card,
    padding: 22,
    paddingTop: 26,
    gap: 18,
    marginBottom: 26,
  },
  badge: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { color: '#2e2733', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  perkIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  perkTitle: { color: colors.text, fontSize: 15.5, fontWeight: '600' },
  perkDesc: { color: colors.muted, fontSize: 13, marginTop: 1 },
  oneTime: { color: colors.muted, fontSize: 12.5, textAlign: 'center', marginTop: 12 },
  restore: { alignSelf: 'center', marginTop: 16, padding: 8 },
  restoreText: { color: colors.glow, fontSize: 14, fontWeight: '500' },
});
