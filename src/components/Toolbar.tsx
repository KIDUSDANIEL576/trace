import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BRUSHES, BRUSH_ORDER, PREMIUM_BRUSHES } from '@/lib/brushes';
import { colors, radius, swatches } from '@/theme/tokens';
import type { Brush } from '@/types';

interface Props {
  brush: Brush;
  color: string;
  premium: boolean;
  onBrush: (b: Brush) => void;
  onColor: (c: string) => void;
  onLockedBrush: () => void;
}

export function Toolbar({ brush, color, premium, onBrush, onColor, onLockedBrush }: Props) {
  return (
    <View>
      <View style={styles.row}>
        {BRUSH_ORDER.map((b) => {
          const on = b === brush;
          const locked = !premium && PREMIUM_BRUSHES.has(b);
          return (
            <Pressable
              key={b}
              onPress={() => (locked ? onLockedBrush() : onBrush(b))}
              style={[styles.tool, on && styles.toolOn]}
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
        {swatches.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            style={[styles.sw, { backgroundColor: c }, c === color && styles.swOn]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tool: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    borderRadius: radius.tool,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  toolOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
  toolText: { color: colors.text, fontSize: 13.5, fontWeight: '500' },
  toolLocked: { color: colors.muted },
  toolTextOn: { color: '#ffb9c2' },
  swRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 },
  sw: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  swOn: { borderColor: '#ffffff' },
});
