import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input, Screen, Wordmark } from '@/components/ui';
import { createCouple, joinCouple } from '@/hooks/useCouple';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme/tokens';

export default function Pair() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  function requireName(): string | null {
    const n = name.trim();
    if (!n) {
      Alert.alert('Your name first', 'It shows on the "…is drawing" pill.');
      return null;
    }
    return n;
  }

  async function onCreate() {
    const n = requireName();
    if (!n) return;
    setBusy('create');
    try {
      const res = await createCouple(n);
      setInviteCode(res.invite_code);
    } catch (e) {
      Alert.alert('Could not create', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function onJoin() {
    const n = requireName();
    if (!n) return;
    if (code.trim().length !== 6) {
      Alert.alert('Invite code', 'Ask your person for their 6-character code.');
      return;
    }
    setBusy('join');
    try {
      await joinCouple(code, n);
      router.replace('/canvas');
    } catch (e) {
      Alert.alert('Could not join', e instanceof Error ? e.message : 'Check the code.');
    } finally {
      setBusy(null);
    }
  }

  function shareCode(c: string) {
    Share.share({
      message: `Leave me a trace ❤️ Get the Trace app and join our canvas with code ${c}`,
    }).catch(() => {});
  }

  if (inviteCode) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.h1}>Your code</Text>
          <Pressable style={styles.codeCard} onPress={() => shareCode(inviteCode)}>
            <Text style={styles.bigCode}>{inviteCode}</Text>
            <Text style={styles.tapShare}>tap to share</Text>
          </Pressable>
          <Text style={styles.sub}>
            Send this to your person. The canvas is yours the moment they join — you can start
            drawing now.
          </Text>
          <View style={{ height: 20 }} />
          <Button title="Share the code" onPress={() => shareCode(inviteCode)} />
          <View style={{ height: 10 }} />
          <Button
            title="Open our canvas"
            variant="ghost"
            onPress={() => router.replace('/canvas')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Wordmark size={30} />
          <Text style={styles.h1}>Two people.{'\n'}One canvas.</Text>
          <View style={{ height: 20 }} />
          <Input placeholder="Your name" value={name} onChangeText={setName} maxLength={24} />
          <View style={{ height: 24 }} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start a new canvas</Text>
            <Text style={styles.cardSub}>You get a 6-character code for your person.</Text>
            <View style={{ height: 12 }} />
            <Button title="Create our canvas" onPress={onCreate} loading={busy === 'create'} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Join your person</Text>
            <Text style={styles.cardSub}>Enter the code they sent you.</Text>
            <View style={{ height: 12 }} />
            <Input
              placeholder="ABC123"
              autoCapitalize="characters"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              style={{ textAlign: 'center', letterSpacing: 6, fontSize: 20 }}
            />
            <View style={{ height: 10 }} />
            <Button title="Join" variant="ghost" onPress={onJoin} loading={busy === 'join'} />
          </View>

          <Pressable
            onPress={() =>
              supabase.auth.signOut().then(() => router.replace('/sign-in'))
            }
            style={styles.signOut}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 70, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  h1: {
    fontFamily: fonts.handwriting,
    fontSize: 46,
    lineHeight: 48,
    color: colors.text,
    marginTop: 10,
  },
  sub: { color: colors.muted, fontSize: 15, marginTop: 14 },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardSub: { color: colors.muted, fontSize: 13.5, marginTop: 4 },
  codeCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.card,
    paddingVertical: 26,
    alignItems: 'center',
    marginTop: 18,
  },
  bigCode: { color: colors.text, fontSize: 40, fontWeight: '600', letterSpacing: 10 },
  tapShare: { color: colors.muted, fontSize: 12.5, marginTop: 6 },
  signOut: { alignSelf: 'center', marginTop: 8, padding: 10 },
  signOutText: { color: colors.muted, fontSize: 13.5 },
});
