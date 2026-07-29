import { BlurView } from 'expo-blur';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
  /** Corner radius — must be on the clipping view for the blur to round. */
  radius: number;
  /** Sheets sit over busier content, so they use the stronger tint. */
  strong?: boolean;
  /** A soft ink-coloured bloom under the surface. Use sparingly: the dock,
   * and anything that should feel warm rather than merely translucent. */
  glow?: boolean;
  /** Lifts the surface off the canvas. Off for full-width sheets. */
  float?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Applied inside the blur, where padding belongs. */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * One glass surface, used by every floating thing in the app.
 *
 * Four layers, and all four matter:
 *   1. a real backdrop blur (expo-blur — the actual glass)
 *   2. a thin tint, so text always has a ground no matter what's behind it
 *   3. a lit top edge — the single detail that makes glass read as glass,
 *      because real glass catches light on its rim
 *   4. a hairline border to close the shape
 *
 * Android's blur is cheaper than iOS's, so the tint carries more of the work
 * there; the look holds either way.
 */
export function Glass({
  children,
  radius,
  strong,
  glow,
  float = true,
  style,
  contentStyle,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const g = colors.glass;

  return (
    <View style={[float && styles.float, style]}>
      {glow ? (
        <View
          pointerEvents="none"
          style={[
            styles.glow,
            { borderRadius: radius + 10, backgroundColor: g.glowInk },
          ]}
        />
      ) : null}
      <View style={[styles.clip, { borderRadius: radius, borderColor: g.border }]}>
        <BlurView
          intensity={g.blurIntensity}
          tint={g.blurTint}
          // Android's implementation is weaker; lean on the tint there instead
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: strong ? g.tintStrong : g.tint },
          ]}
        />
        {/* the lit rim — thin, only along the top, never a full outline */}
        <View pointerEvents="none" style={[styles.edge, { backgroundColor: g.edge }]} />
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  );
}

/**
 * The same glass, as an absolute fill for surfaces that already own their
 * shape (bottom sheets, full-screen panels). Drop it in as the FIRST child of
 * a container with `overflow: 'hidden'` and a transparent background.
 */
export function GlassFill({ strong }: { strong?: boolean }) {
  const { colors } = useTheme();
  const g = colors.glass;
  return (
    <>
      <BlurView
        intensity={g.blurIntensity}
        tint={g.blurTint}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: strong ? g.tintStrong : g.tint }]}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: '8%',
          right: '8%',
          height: StyleSheet.hairlineWidth * 1.5,
          backgroundColor: g.edge,
          opacity: 0.85,
        }}
      />
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    float: {
      shadowColor: colors.glass.shadow,
      shadowOpacity: 0.45,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    glow: {
      position: 'absolute',
      top: -6,
      left: -6,
      right: -6,
      bottom: -6,
      opacity: 0.9,
    },
    clip: {
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth * 1.5,
    },
    edge: {
      position: 'absolute',
      top: 0,
      left: '8%',
      right: '8%',
      height: StyleSheet.hairlineWidth * 1.5,
      opacity: 0.85,
    },
  });
