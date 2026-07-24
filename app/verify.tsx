import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CodeInput } from '@/components/CodeInput';
import { Button, Screen } from '@/components/ui';
import { notifySuccess, notifyWarn } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, type Palette } from '@/theme/tokens';

const RESEND_COOLDOWN_S = 30;

export default function Verify() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      notifyWarn();
      setCode('');
      Alert.alert('Hmm, that code didn’t work', 'Double-check the 6 numbers and try again.');
      return;
    }
    notifySuccess();
    router.replace('/');
  }

  function onChange(next: string) {
    setCode(next); // CodeInput already strips non-digits; auto-submits via onComplete
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
        <Text style={styles.h1}>Check your email</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.email}>{email}</Text>. Enter it below.
        </Text>
        <View style={{ height: 28 }} />
        <CodeInput value={code} onChange={onChange} onComplete={verify} autoFocus />
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  h1: { fontFamily: fonts.handwriting, fontSize: 44, color: colors.text },
  sub: { color: colors.muted, fontSize: 15.5, marginTop: 10, lineHeight: 23 },
  email: { color: colors.text, fontWeight: '600' },
  resend: { alignSelf: 'center', marginTop: 18, padding: 8 },
  resendText: { color: colors.glow, fontSize: 14, fontWeight: '500' },
});
