import { Canvas } from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';
import type { Stroke } from '@/types';
import { CanvasBackdrop } from './CanvasBackdrop';
import { StrokeRenderer } from './StrokeRenderer';

interface Props {
  visible: boolean;
  /** Whose drawing this is — "Kidus left you a trace". */
  authorName: string;
  strokes: Stroke[];
  bgKey?: string;
  bgPhotoUrl?: string | null;
  bgOpacity?: number;
  photoUrl?: string | null; // when the trace was left on a photo canvas
  seedId?: string;
  /** Dismiss into drawing on this same canvas. */
  onDraw: () => void;
}

/**
 * The moment of receiving. Tapping the widget (or the push) doesn't drop you
 * into a toolbar — their drawing arrives full-screen, the way a letter arrives,
 * and one tap anywhere turns it into the canvas you draw back on.
 */
export function TraceReveal({
  visible,
  authorName,
  strokes,
  bgKey,
  bgPhotoUrl,
  bgOpacity,
  photoUrl,
  seedId,
  onDraw,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      a.setValue(0);
      return;
    }
    Animated.timing(a, {
      toValue: 1,
      duration: reduceMotion ? 260 : 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, a]);

  // the drawing settles in rather than snapping — like paper being set down
  const scale = reduceMotion
    ? 1
    : a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
  const opacity = a.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });

  function handleDraw() {
    tapLight();
    onDraw();
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onDraw} transparent={false}>
      <Pressable
        style={[styles.root, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}
        onPress={handleDraw}
        accessibilityRole="button"
        accessibilityLabel={`A trace from ${authorName}. Tap to draw back.`}
      >
        <Text style={styles.from}>{authorName} left you a trace</Text>

        <Animated.View style={[styles.boardWrap, { opacity, transform: [{ scale }] }]}>
          <View
            style={styles.board}
            onLayout={(e) =>
              setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
            }
          >
            {size.w > 0 && (
              <Canvas style={StyleSheet.absoluteFill}>
                <CanvasBackdrop
                  w={size.w}
                  h={size.h}
                  board={colors.board}
                  photoUrl={photoUrl}
                  bgKey={bgKey}
                  bgPhotoUrl={bgPhotoUrl}
                  bgOpacity={bgOpacity}
                  seedId={seedId}
                />
                {strokes
                  // invisible ink stays invisible, even here
                  .filter((s) => s.brush !== 'invisible')
                  .map((s) => (
                    <StrokeRenderer key={s.id} stroke={s} width={size.w} height={size.h} />
                  ))}
              </Canvas>
            )}
          </View>
        </Animated.View>

        <Pressable
          onPress={handleDraw}
          accessibilityRole="button"
          accessibilityLabel="Draw back"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>Draw back ❤</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.night,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    },
    from: {
      fontFamily: fonts.handwriting,
      fontSize: 27,
      color: colors.text,
      textAlign: 'center',
    },
    boardWrap: { width: '100%', alignItems: 'center' },
    board: {
      width: '100%',
      aspectRatio: 1 / 1.1,
      borderRadius: radius.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.line,
    },
    cta: {
      minHeight: 52,
      paddingHorizontal: 30,
      borderRadius: radius.button,
      backgroundColor: colors.inkSoft,
      borderWidth: 1,
      borderColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
    ctaText: { color: colors.inkText, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  });
