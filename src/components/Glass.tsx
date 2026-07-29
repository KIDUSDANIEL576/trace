import { BlurView } from 'expo-blur';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { GlassPalette, Palette } from '@/theme/tokens';

/**
 * Android's real-blur backend, off by default — and deliberately so.
 *
 * expo-blur only blurs on Android through `experimentalBlurMethod:
 * 'dimezisBlurView'`, whose own documentation warns it "may lead to decreased
 * performance and rendering issues during transitions made by
 * react-native-screens". Every screen in this app navigates through
 * react-native-screens (expo-router), and every sheet is a Modal — precisely
 * the two cases named. A frosted dock is not worth a torn transition, so
 * Android leans on a heavier tint instead and looks frosted without the risk.
 *
 * Flip this to true to try real Android blur on a device; iOS is unaffected.
 */
const ANDROID_REAL_BLUR = false;

const blurMethod = Platform.OS === 'android' && ANDROID_REAL_BLUR ? 'dimezisBlurView' : 'none';
const tintFor = (g: GlassPalette, strong?: boolean) => {
  if (Platform.OS === 'android' && !ANDROID_REAL_BLUR) {
    return strong ? g.tintStrongAndroid : g.tintAndroid;
  }
  return strong ? g.tintStrong : g.tint;
};

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
 *   1. a backdrop blur (the actual glass, on iOS and web)
 *   2. a tint, so text always has a ground no matter what's behind it
 *   3. a lit top edge — the single detail that makes glass read as glass,
 *      because real glass catches light on its rim
 *   4. a hairline border to close the shape
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
          style={[styles.glow, { borderRadius: radius + 10, backgroundColor: g.glowInk }]}
        />
      ) : null}
      <View style={[styles.clip, { borderRadius: radius, borderColor: g.border }]}>
        <BlurView
          intensity={g.blurIntensity}
          tint={g.blurTint}
          experimentalBlurMethod={blurMethod}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: tintFor(g, strong) }]}
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
        experimentalBlurMethod={blurMethod}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tintFor(g, strong) }]}
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
