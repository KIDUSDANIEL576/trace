import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "Reduce Motion" accessibility setting (iOS: Settings →
 * Accessibility → Motion; Android: Remove animations). When on, motion-heavy
 * flourishes should fall back to a still or a plain fade — movement, scaling,
 * and bounce are what trigger vestibular discomfort, not opacity.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => mounted && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduce(v)
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
