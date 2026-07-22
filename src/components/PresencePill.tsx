import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Palette } from '@/theme/tokens';

/** "Kidus is drawing…" pill with the blinking caret from the prototype. */
export function PresencePill({ name }: { name: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const blink = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0.2, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  return (
    <View style={styles.pill}>
      <View style={styles.dot}>
        <Text style={{ fontSize: 10 }}>✏️</Text>
      </View>
      <Text style={styles.label}>
        <Text style={styles.name}>{name}</Text> is drawing
      </Text>
      <Animated.View style={[styles.caret, { opacity: blink }]} />
    </View>
  );
}

// Sits over the canvas imagery, so it keeps a dark glass on every theme (reads
// over both light and dark grounds) while ink/glow follow the palette.
const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(10,9,13,0.62)',
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingLeft: 7,
      paddingRight: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      alignSelf: 'flex-start',
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { color: '#ffffff', fontSize: 12.5, fontWeight: '500' },
    name: { color: colors.glow },
    caret: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.glow },
  });
