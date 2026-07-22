import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { tapLight } from '@/lib/haptics';
import { colors, fonts, radius } from '@/theme/tokens';

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Wordmark({ size = 30 }: { size?: number }) {
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
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => !off && tapLight()}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' ? styles.btnPrimary : styles.btnGhost,
        pressed && !off && styles.btnPressed,
        off && styles.btnOff,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.text} />
      ) : (
        <Text style={[styles.btnText, variant === 'ghost' && styles.btnTextGhost]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
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
  return (
    <View style={[styles.screen, styles.loadingWrap]}>
      <ActivityIndicator color={colors.ink} size="large" />
      {label ? <Text style={styles.loadingText}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night, paddingHorizontal: 22 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: colors.muted, fontSize: 14, fontFamily: fonts.handwritingMedium },
  wordmark: { fontFamily: fonts.handwriting, color: colors.text },
  btn: {
    borderRadius: radius.button,
    minHeight: 54, // comfortable tap target (Apple HIG: 44pt minimum)
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
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
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
