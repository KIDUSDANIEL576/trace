import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Input, Screen, Wordmark } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme/tokens';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    const target = email.trim().toLowerCase();
    if (!target.includes('@')) {
      Alert.alert('Enter your email', 'We send a one-time code — no passwords.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    router.push({ pathname: '/verify', params: { email: target } });
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={{ marginBottom: 8 }}>
          <Wordmark size={34} />
        </View>
        <Text style={styles.h1}>
          Leave me{'\n'}a <Text style={{ color: colors.ink }}>trace.</Text>
        </Text>
        <Text style={styles.sub}>
          Whatever one of you draws appears on the other&apos;s phone — stroke by stroke, in
          real time.
        </Text>
        <View style={{ height: 28 }} />
        <Input
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={sendCode}
        />
        <View style={{ height: 12 }} />
        <Button title="Send me a code" onPress={sendCode} loading={busy} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  h1: {
    fontFamily: fonts.handwriting,
    fontSize: 56,
    lineHeight: 58,
    color: colors.text,
  },
  sub: { color: colors.muted, fontSize: 15.5, marginTop: 12, maxWidth: 320 },
});
