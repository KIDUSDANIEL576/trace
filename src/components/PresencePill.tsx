import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Palette } from '@/theme/tokens';
import { Glass } from './Glass';

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
    <Glass radius={radius.pill} glow style={styles.lift} contentStyle={styles.pill}>
      <View style={styles.dot}>
        <Text style={{ fontSize: 10 }}>✏️</Text>
      </View>
      <Text style={styles.label}>
        <Text style={styles.name}>{name}</Text> is drawing
      </Text>
      <Animated.View style={[styles.caret, { opacity: blink }]} />
    </Glass>
  );
}

// Floating chrome over the canvas, so it's glass — and it glows, because this
// pill means the other person's finger is on the screen right now.
const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    lift: {
      alignSelf: 'flex-start',
      shadowColor: colors.ink,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 3 },
      elevation: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 7,
      paddingLeft: 8,
      paddingRight: 13,
    },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { color: colors.onOverlay, fontSize: 12.5, fontWeight: '500' },
    name: { color: colors.linkText },
    caret: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.glow },
  });
