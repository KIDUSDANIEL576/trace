import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BRUSHES, BRUSH_ORDER } from '@/lib/brushes';
import { colors, radius, swatches } from '@/theme/tokens';
import type { Brush } from '@/types';

interface Props {
  brush: Brush;
  color: string;
  onBrush: (b: Brush) => void;
  onColor: (c: string) => void;
}

export function Toolbar({ brush, color, onBrush, onColor }: Props) {
  return (
    <View>
      <View style={styles.row}>
        {BRUSH_ORDER.map((b) => {
          const on = b === brush;
          return (
            <Pressable
              key={b}
              onPress={() => onBrush(b)}
              style={[styles.tool, on && styles.toolOn]}
            >
              <Text style={[styles.toolText, on && styles.toolTextOn]}>{BRUSHES[b].label}</Text>
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
  toolTextOn: { color: '#ffb9c2' },
  swRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 },
  sw: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  swOn: { borderColor: '#ffffff' },
});
