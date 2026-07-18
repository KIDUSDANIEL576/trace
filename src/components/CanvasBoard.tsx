import { Canvas } from '@shopify/react-native-skia';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, fonts, radius } from '@/theme/tokens';
import type { Brush, Point, Stroke } from '@/types';
import { CanvasBackdrop } from './CanvasBackdrop';
import { StrokeRenderer } from './StrokeRenderer';

interface Props {
  strokes: Stroke[];
  liveStrokes: Record<string, Stroke>;
  brush: Brush;
  color: string;
  brushWidth: number;
  photoUrl?: string | null;
  onBegin: (brush: Brush, color: string, width: number) => string;
  onPoint: (strokeId: string, pt: Point) => void;
  onEnd: (strokeId: string) => void;
}

const MIN_SEGMENT_PX = 1.5; // same point-thinning as the prototype

/**
 * The shared canvas: a dusk-gradient "photo" background (from the prototype)
 * with all persisted + in-flight strokes on top, and finger drawing input.
 */
export function CanvasBoard({
  strokes,
  liveStrokes,
  brush,
  color,
  brushWidth,
  photoUrl,
  onBegin,
  onPoint,
  onEnd,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const activeIdRef = useRef<string | null>(null);
  const lastPxRef = useRef<{ x: number; y: number } | null>(null);

  const toNorm = useCallback(
    (x: number, y: number): Point => [
      Math.min(1, Math.max(0, x / size.w)),
      Math.min(1, Math.max(0, y / size.h)),
    ],
    [size]
  );

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(1)
    .maxPointers(1)
    .onBegin((e) => {
      if (!size.w) return;
      const id = onBegin(brush, color, brushWidth);
      activeIdRef.current = id;
      lastPxRef.current = { x: e.x, y: e.y };
      onPoint(id, toNorm(e.x, e.y));
    })
    .onUpdate((e) => {
      const id = activeIdRef.current;
      const last = lastPxRef.current;
      if (!id || !last || !size.w) return;
      if (Math.hypot(e.x - last.x, e.y - last.y) < MIN_SEGMENT_PX) return;
      lastPxRef.current = { x: e.x, y: e.y };
      onPoint(id, toNorm(e.x, e.y));
    })
    .onFinalize(() => {
      const id = activeIdRef.current;
      activeIdRef.current = null;
      lastPxRef.current = null;
      if (id) onEnd(id);
    });

  const hasInk = strokes.length > 0 || Object.keys(liveStrokes).length > 0;
  const { w, h } = size;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.board}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {w > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            <CanvasBackdrop w={w} h={h} photoUrl={photoUrl} />
            {strokes.map((s) => (
              <StrokeRenderer key={s.id} stroke={s} width={w} height={h} />
            ))}
            {Object.values(liveStrokes).map((s) => (
              <StrokeRenderer key={s.id} stroke={s} width={w} height={h} />
            ))}
          </Canvas>
        )}
        {!hasInk && (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hint}>draw here ✏️</Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: {
    aspectRatio: 1 / 1.1,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  hintWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: fonts.handwriting,
    fontSize: 30,
    color: 'rgba(255,255,255,0.85)',
  },
});
