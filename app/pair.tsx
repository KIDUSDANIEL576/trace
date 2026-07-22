import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { deleteAccount } from '@/lib/account';
import { notifySuccess, notifyWarn } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';

export default function Pair() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);

  function requireName(): string | null {
    const n = name.trim();
    if (!n) {
      notifyWarn();
      Alert.alert('What’s your name?', 'Your person will see it when you draw.');
      return null;
    }
    return n;
  }

  async function onCreate() {
    if (busy) return;
    const n = requireName();
    if (!n) return;
    setBusy('create');
    try {
      const res = await createCouple(n);
      notifySuccess();
      setInviteCode(res.invite_code);
    } catch (e) {
      notifyWarn();
      Alert.alert('Could not create', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function onJoin() {
    if (busy) return;
    const n = requireName();
    if (!n) return;
    if (code.trim().length !== 6) {
      notifyWarn();
      Alert.alert('Enter their code', 'Ask your person for their 6-character code.');
      return;
    }
    setBusy('join');
    try {
      await joinCouple(code, n);
      notifySuccess();
      router.replace('/canvas');
    } catch (e) {
      notifyWarn();
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
          <Text style={styles.h1}>Your code is ready</Text>
          <Text style={styles.sub}>Send it to your person so they can join you.</Text>
          <Pressable
            style={styles.codeCard}
            onPress={() => shareCode(inviteCode)}
            accessibilityRole="button"
            accessibilityLabel={`Your invite code is ${inviteCode.split('').join(' ')}. Tap to share.`}
          >
            <Text style={styles.codeCardLabel}>YOUR INVITE CODE</Text>
            <Text style={styles.bigCode}>{inviteCode}</Text>
            <Text style={styles.tapShare}>tap to share</Text>
          </Pressable>
          <Text style={styles.hint}>
            The canvas is already yours — you can start drawing now, and they’ll see it the moment
            they join. ❤️
          </Text>
          <View style={{ height: 24 }} />
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
          <Text style={styles.lede}>
            One of you starts a canvas and shares the code. The other joins with it. That’s the
            whole setup.
          </Text>
          <View style={{ height: 22 }} />
          <Text style={styles.fieldLabel}>Your name</Text>
          <Input
            placeholder="e.g. Kidus"
            value={name}
            onChangeText={setName}
            maxLength={24}
            returnKeyType="done"
          />
          <View style={{ height: 24 }} />

          <View style={styles.card}>
            <Text style={styles.cardStep}>START HERE</Text>
            <Text style={styles.cardTitle}>Start a new canvas</Text>
            <Text style={styles.cardSub}>You’ll get a 6-character code to send your person.</Text>
            <View style={{ height: 14 }} />
            <Button title="Create our canvas" onPress={onCreate} loading={busy === 'create'} />
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardStep}>ALREADY HAVE A CODE?</Text>
            <Text style={styles.cardTitle}>Join your person</Text>
            <Text style={styles.cardSub}>Type the code they sent you.</Text>
            <View style={{ height: 14 }} />
            <Input
              placeholder="ABC123"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              value={code}
              onChangeText={setCode}
              style={styles.codeInput}
            />
            <View style={{ height: 12 }} />
            <Button title="Join" variant="ghost" onPress={onJoin} loading={busy === 'join'} />
          </View>

          <View style={{ height: 8 }} />
          <Pressable
            onPress={() => supabase.auth.signOut().then(() => router.replace('/sign-in'))}
            style={styles.signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Delete your account?', 'This is permanent and can’t be undone.', [
                { text: 'Keep it', style: 'cancel' },
                {
                  text: 'Delete forever',
                  style: 'destructive',
                  onPress: async () => {
                    if (await deleteAccount()) router.replace('/sign-in');
                  },
                },
              ])
            }
            style={styles.deleteLink}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  scroll: { paddingTop: 70, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center' },
  h1: {
    fontFamily: fonts.handwriting,
    fontSize: 46,
    lineHeight: 48,
    color: colors.text,
    marginTop: 10,
  },
  lede: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12 },
  sub: { color: colors.muted, fontSize: 15, marginTop: 10, textAlign: 'center' },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
    textAlign: 'center',
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 22,
  },
  cardStep: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  cardSub: { color: colors.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '600',
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  codeCard: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.card,
    paddingVertical: 28,
    alignItems: 'center',
    marginTop: 22,
  },
  codeCardLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  bigCode: { color: colors.text, fontSize: 44, fontWeight: '700', letterSpacing: 12 },
  tapShare: { color: colors.glow, fontSize: 13, marginTop: 10, fontWeight: '500' },
  signOut: { alignSelf: 'center', marginTop: 20, padding: 10 },
  signOutText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  deleteLink: { alignSelf: 'center', marginTop: 2, padding: 10 },
  deleteText: { color: colors.muted, fontSize: 12.5 },
});
