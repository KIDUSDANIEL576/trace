import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BRUSHES, BRUSH_ORDER, PREMIUM_BRUSHES } from '@/lib/brushes';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, swatches, type Palette } from '@/theme/tokens';
import type { Brush } from '@/types';

interface Props {
  brush: Brush;
  color: string;
  premium: boolean;
  onBrush: (b: Brush) => void;
  onColor: (c: string) => void;
  onLockedBrush: () => void;
}

const COLOR_NAMES: Record<string, string> = {
  '#e23343': 'red',
  '#ff7a9c': 'pink',
  '#ffffff': 'white',
  '#f4c66b': 'gold',
  '#7ec8ff': 'blue',
};

export function Toolbar({ brush, color, premium, onBrush, onColor, onLockedBrush }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <View style={styles.row}>
        {BRUSH_ORDER.map((b) => {
          const on = b === brush;
          const locked = !premium && PREMIUM_BRUSHES.has(b);
          return (
            <Pressable
              key={b}
              onPress={() => {
                tapLight();
                locked ? onLockedBrush() : onBrush(b);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${BRUSHES[b].label}${locked ? ', locked' : ''}`}
              style={({ pressed }) => [
                styles.tool,
                on && styles.toolOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.toolText, on && styles.toolTextOn, locked && styles.toolLocked]}>
                {locked ? '🔒 ' : ''}
                {BRUSHES[b].label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.swRow}>
        {swatches.map((c) => {
          const on = c === color;
          return (
            <Pressable
              key={c}
              onPress={() => {
                tapLight();
                onColor(c);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${COLOR_NAMES[c] ?? c} ink`}
              hitSlop={8}
              style={({ pressed }) => [styles.swWrap, pressed && styles.pressed]}
            >
              <View style={[styles.sw, { backgroundColor: c }, on && styles.swOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    tool: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel,
      borderRadius: radius.tool,
      minHeight: 44,
      paddingVertical: 11,
      paddingHorizontal: 15,
      justifyContent: 'center',
    },
    toolOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
    toolText: { color: colors.text, fontSize: 14, fontWeight: '500' },
    toolLocked: { color: colors.muted },
    toolTextOn: { color: colors.ink, fontWeight: '600' },
    pressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
    swRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 14 },
    swWrap: { padding: 3, borderRadius: 24 },
    sw: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'rgba(128,128,128,0.25)',
    },
    swOn: {
      borderColor: colors.ring,
      borderWidth: 3,
      transform: [{ scale: 1.15 }],
      shadowColor: colors.ring,
      shadowOpacity: 0.5,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
  });
