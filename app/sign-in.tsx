import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input, Screen, Wordmark } from '@/components/ui';
import { notifyWarn } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, type Palette } from '@/theme/tokens';

// App Store review: reviewers can't receive our OTP emails, so this one demo
// account takes a password path instead (Apple requires a way in — see
// ROADMAP.md Tier 3). The password only unlocks a sandboxed demo couple.
const REVIEW_EMAIL = 'review@trace.demo';
const REVIEW_PASSWORD = 'trace-review-2026!';

export default function SignIn() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  // gentle entrance: the hero breathes in instead of popping
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 550, useNativeDriver: true }).start();
  }, [enter]);
  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  async function sendCode() {
    if (busy) return; // keyboard submit isn't disabled like the button is
    const target = email.trim().toLowerCase();
    if (!target.includes('@') || !target.includes('.')) {
      notifyWarn();
      Alert.alert('Enter your email', 'We’ll email you a one-time code — no password to remember.');
      return;
    }
    if (target === REVIEW_EMAIL) {
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: REVIEW_EMAIL,
        password: REVIEW_PASSWORD,
      });
      setBusy(false);
      if (error) {
        notifyWarn();
        Alert.alert('Could not sign in', error.message);
        return;
      }
      router.replace('/');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      notifyWarn();
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
        <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }] }}>
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
        </Animated.View>
        <View style={{ height: 32 }} />
        <Text style={styles.fieldLabel}>Your email</Text>
        <Input
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="go"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={sendCode}
        />
        <View style={{ height: 12 }} />
        <Button title="Send me a code" onPress={sendCode} loading={busy} />
        <Text style={styles.reassure}>No password. We email you a 6-digit code to sign in.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  h1: {
    fontFamily: fonts.handwriting,
    fontSize: 56,
    lineHeight: 58,
    color: colors.text,
  },
  sub: { color: colors.muted, fontSize: 15.5, marginTop: 12, maxWidth: 320, lineHeight: 23 },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  reassure: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 19,
  },
});
