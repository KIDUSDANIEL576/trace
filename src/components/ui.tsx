import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';

export function Screen({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={styles.screen}>{children}</View>;
}

export function Wordmark({ size = 30 }: { size?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Text
      style={[styles.wordmark, { fontSize: size }]}
      accessibilityRole="header"
      accessibilityLabel="Trace"
    >
      tra<Text style={{ color: colors.ink }}>ce</Text>
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const off = disabled || loading;
  // spring physics instead of a static pressed style — the press sinks in and
  // releases with a small overshoot, which is most of what "feels native" means
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => {
    if (off) return;
    tapLight();
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 9 }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      <Animated.View
        style={[
          styles.btn,
          variant === 'primary' ? styles.btnPrimary : styles.btnGhost,
          off && styles.btnOff,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.text} />
        ) : (
          <Text style={[styles.btnText, variant === 'ghost' && styles.btnTextGhost]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.ink}
      accessibilityLabel={typeof props.placeholder === 'string' ? props.placeholder : undefined}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // a quiet heartbeat instead of a generic spinner — lub-dub, pause, repeat
  const beat = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const lub = (to: number, ms: number) =>
      Animated.timing(beat, { toValue: to, duration: ms, useNativeDriver: true });
    const loop = Animated.loop(
      Animated.sequence([lub(1.18, 140), lub(1, 140), lub(1.12, 130), lub(1, 500)])
    );
    loop.start();
    return () => loop.stop();
  }, [beat]);
  return (
    <View style={[styles.screen, styles.loadingWrap]}>
      <Animated.Text style={[styles.loadingHeart, { transform: [{ scale: beat }] }]}>
        ♥
      </Animated.Text>
      {label ? <Text style={styles.loadingText}>{label}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.night, paddingHorizontal: 22 },
    loadingWrap: { alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingHeart: { color: colors.ink, fontSize: 44, lineHeight: 52 },
    loadingText: { color: colors.muted, fontSize: 14, fontFamily: fonts.handwritingMedium },
    wordmark: { fontFamily: fonts.handwriting, color: colors.text },
    btn: {
      borderRadius: radius.button,
      minHeight: 54,
      paddingVertical: 16,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPrimary: {
      backgroundColor: colors.ink,
      shadowColor: colors.ink,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    btnGhost: { backgroundColor: colors.panel2, borderWidth: 1, borderColor: colors.line },
    btnOff: { opacity: 0.45 },
    btnText: { color: '#ffffff', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
    btnTextGhost: { color: colors.text },
    input: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.button,
      paddingHorizontal: 18,
      paddingVertical: 16,
      color: colors.text,
      fontSize: 17,
      minHeight: 54,
    },
  });
