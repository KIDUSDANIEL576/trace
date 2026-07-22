import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

/**
 * Ephemeral heart that blooms across the canvas when a Heartbeat is sent or
 * received. Not a saved stroke — it swells and fades, then it's gone.
 * Re-runs whenever `trigger` changes (0 = idle, never animates on mount).
 */
export function HeartBloom({ trigger }: { trigger: number }) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === 0) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 950,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [trigger, a]);

  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.7] });
  const opacity = a.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.95, 0] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.Text style={[styles.heart, { opacity, transform: [{ scale }] }]}>❤️</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  heart: { fontSize: 130 },
});
