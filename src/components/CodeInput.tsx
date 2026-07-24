import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Palette } from '@/theme/tokens';

interface Props {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  /** 'numeric' = OTP digits; 'code' = A-Z/0-9 invite code (auto-uppercased). */
  mode?: 'numeric' | 'code';
  autoFocus?: boolean;
  /** Fired once when the last cell fills. */
  onComplete?: (full: string) => void;
}

/**
 * Segmented one-character-per-cell input — the standard premium pattern for
 * OTP and invite codes. One invisible TextInput owns focus and the keyboard;
 * the cells are a pure visual projection of its value, so paste, backspace,
 * and autofill all behave natively.
 */
export function CodeInput({
  length = 6,
  value,
  onChange,
  mode = 'numeric',
  autoFocus,
  onComplete,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const caret = useRef(new Animated.Value(1)).current;

  // blinking caret in the active cell
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(caret, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [caret]);

  function handleChange(raw: string) {
    const cleaned =
      mode === 'numeric'
        ? raw.replace(/[^0-9]/g, '')
        : raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const next = cleaned.slice(0, length);
    if (next.length > value.length) tapLight(); // feel each character land
    onChange(next);
    if (next.length === length && value.length < length) onComplete?.(next);
  }

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel={`${mode === 'numeric' ? 'Code' : 'Invite code'} input, ${value.length} of ${length} entered`}
    >
      <View style={styles.row} pointerEvents="none">
        {Array.from({ length }, (_, i) => {
          const char = value[i] ?? '';
          const isActive = focused && i === activeIndex && value.length < length;
          return (
            <View
              key={i}
              style={[styles.cell, char !== '' && styles.cellFilled, isActive && styles.cellActive]}
            >
              {char !== '' ? (
                <Text style={styles.char}>{char}</Text>
              ) : isActive ? (
                <Animated.View style={[styles.caret, { opacity: caret }]} />
              ) : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={mode === 'numeric' ? 'number-pad' : 'default'}
        autoCapitalize={mode === 'code' ? 'characters' : 'none'}
        autoCorrect={false}
        autoComplete={mode === 'numeric' ? 'one-time-code' : 'off'}
        textContentType={mode === 'numeric' ? 'oneTimeCode' : 'none'}
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
      />
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    cell: {
      flex: 1,
      maxWidth: 56,
      aspectRatio: 0.82,
      borderRadius: radius.tool,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.panel,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellFilled: { borderColor: colors.line, backgroundColor: colors.panel2 },
    cellActive: {
      borderColor: colors.ink,
      shadowColor: colors.ink,
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    char: { color: colors.text, fontSize: 24, fontWeight: '700' },
    caret: { width: 2, height: 26, borderRadius: 1, backgroundColor: colors.ink },
    hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  });
