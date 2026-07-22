import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface Props {
  trigger: number; // bump to animate (0 = idle, never animates on mount)
  burst?: boolean; // Mutual Heartbeat: three hearts erupt instead of one
}

/**
 * Ephemeral heart(s) that bloom across the canvas when a Heartbeat is sent or
 * received. Not a saved stroke — it swells and fades, then it's gone. When
 * both partners press within the same moment (`burst`), three hearts erupt.
 */
export function HeartBloom({ trigger, burst }: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === 0) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: burst ? 1250 : 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [trigger, burst, a]);

  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.4, burst ? 2.1 : 1.7] });
  const opacity = a.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.95, 0] });
  const sideLift = a.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const sideDrop = a.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {burst ? (
        <Animated.View style={[styles.row, { opacity, transform: [{ scale }] }]}>
          <Animated.Text style={[styles.small, { transform: [{ translateY: sideLift }] }]}>
            ❤️
          </Animated.Text>
          <Animated.Text style={styles.heart}>❤️</Animated.Text>
          <Animated.Text style={[styles.small, { transform: [{ translateY: sideDrop }] }]}>
            ❤️
          </Animated.Text>
        </Animated.View>
      ) : (
        <Animated.Text style={[styles.heart, { opacity, transform: [{ scale }] }]}>
          ❤️
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heart: { fontSize: 130 },
  small: { fontSize: 64 },
});
