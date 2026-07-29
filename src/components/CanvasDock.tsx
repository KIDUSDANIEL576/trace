import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BRUSHES, BRUSH_ORDER, PREMIUM_BRUSHES } from '@/lib/brushes';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, swatches, type Palette } from '@/theme/tokens';
import { Glass } from './Glass';
import type { Brush } from '@/types';

interface Props {
  brush: Brush;
  color: string;
  premium: boolean;
  canUndo: boolean;
  onBrush: (b: Brush) => void;
  onColor: (c: string) => void;
  onLockedBrush: () => void;
  onHeart: () => void;
  onUndo: () => void;
  onMore: () => void;
}

// Compact glyphs so five brushes fit one dock row; labels stay full for a11y.
const BRUSH_ICONS: Record<Brush, string> = {
  marker: '✏️',
  glow: '✨',
  neon: '⚡️',
  chalk: '🖍️',
  invisible: '👻',
};

const COLOR_NAMES: Record<string, string> = {
  '#e23343': 'red',
  '#ff7a9c': 'pink',
  '#ffffff': 'white',
  '#f4c66b': 'gold',
  '#7ec8ff': 'blue',
};

/**
 * The floating glass dock — everything you touch while drawing, in one bar:
 * brushes on top; inks, the heart, undo, and the ⋯ menu below. The canvas is
 * the app; this is the only chrome that lives near your thumb.
 */
export function CanvasDock({
  brush,
  color,
  premium,
  canUndo,
  onBrush,
  onColor,
  onLockedBrush,
  onHeart,
  onUndo,
  onMore,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Glass radius={26} glow contentStyle={styles.dock}>
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
              style={({ pressed }) => [styles.brush, on && styles.brushOn, pressed && styles.pressed]}
            >
              <Text style={styles.brushIcon}>{BRUSH_ICONS[b]}</Text>
              {locked ? <Text style={styles.lock}>🔒</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
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
              hitSlop={6}
              style={({ pressed }) => [styles.swWrap, pressed && styles.pressed]}
            >
              <View style={[styles.sw, { backgroundColor: c }, on && styles.swOn]} />
            </Pressable>
          );
        })}

        <View style={styles.divider} />

        <Pressable
          onPress={onHeart}
          accessibilityRole="button"
          accessibilityLabel="Send a heartbeat"
          style={({ pressed }) => [styles.action, styles.heart, pressed && styles.pressed]}
        >
          <Text style={styles.heartText}>❤</Text>
        </Pressable>
        <Pressable
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo my last stroke"
          accessibilityState={{ disabled: !canUndo }}
          style={({ pressed }) => [styles.action, !canUndo && styles.off, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>↺</Text>
        </Pressable>
        <Pressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel="More — sky, photo, replay, capsule, share, clear"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>⋯</Text>
        </Pressable>
      </View>
    </Glass>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    dock: { paddingHorizontal: 12, paddingVertical: 11, gap: 11 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brush: {
      width: 46,
      height: 40,
      borderRadius: radius.tool,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass.wellIdle,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    brushOn: {
      backgroundColor: colors.inkSoft,
      borderWidth: 1,
      borderColor: colors.ink,
      // the chosen brush glows, like the tool you're actually holding
      shadowColor: colors.ink,
      shadowOpacity: 0.5,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 0 },
      elevation: 5,
    },
    brushIcon: { fontSize: 19 },
    lock: { position: 'absolute', bottom: 1, right: 3, fontSize: 9 },
    swWrap: { padding: 2, borderRadius: 20 },
    sw: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: 'rgba(128,128,128,0.3)',
    },
    swOn: {
      borderColor: colors.ring,
      borderWidth: 2.5,
      transform: [{ scale: 1.2 }],
      shadowColor: colors.glow,
      shadowOpacity: 0.7,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    divider: { width: 1, height: 24, backgroundColor: colors.glass.border },
    action: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass.wellIdle,
    },
    heart: {
      backgroundColor: colors.ink,
      borderWidth: 1,
      borderColor: colors.ink,
      shadowColor: colors.ink,
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 5,
    },
    heartText: { color: '#ffffff', fontSize: 19, fontWeight: '700' },
    actionText: { color: colors.onOverlay, fontSize: 20, fontWeight: '600' },
    off: { opacity: 0.35 },
    pressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
  });
