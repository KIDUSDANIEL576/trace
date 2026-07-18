import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/theme/tokens';

const RESEND_COOLDOWN_S = 30;

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(token: string) {
    if (!email || token.length < 6 || submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (error) {
      submittedRef.current = false;
      Alert.alert('Wrong code', 'Check the digits and try again.');
      return;
    }
    router.replace('/');
  }

  function onChange(next: string) {
    const digits = next.replace(/[^0-9]/g, '');
    setCode(digits);
    if (digits.length === 6) verify(digits); // auto-submit on 6th digit
  }

  async function resend() {
    if (cooldown > 0 || !email) return;
    setCooldown(RESEND_COOLDOWN_S);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) Alert.alert('Could not resend', error.message);
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <Text style={styles.h1}>Check your inbox</Text>
        <Text style={styles.sub}>We sent a 6-digit code to {email}.</Text>
        <View style={{ height: 24 }} />
        <Input
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={onChange}
          onSubmitEditing={() => verify(code)}
          style={styles.code}
          autoFocus
        />
        <View style={{ height: 12 }} />
        <Button
          title="Verify"
          onPress={() => verify(code)}
          loading={busy}
          disabled={code.length < 6}
        />
        <Pressable onPress={resend} disabled={cooldown > 0} style={styles.resend}>
          <Text style={[styles.resendText, cooldown > 0 && { opacity: 0.45 }]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  h1: { fontFamily: fonts.handwriting, fontSize: 42, color: colors.text },
  sub: { color: colors.muted, fontSize: 15, marginTop: 8 },
  code: { textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  resend: { alignSelf: 'center', marginTop: 18, padding: 8 },
  resendText: { color: colors.glow, fontSize: 14, fontWeight: '500' },
});
