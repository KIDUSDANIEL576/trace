import { Canvas, type useCanvasRef } from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';
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
  revealInvisible?: boolean;
  prompt?: string; // today's idea, shown only while the canvas is empty
  seedId?: string; // seeds the film grain/bokeh scatter, so both phones match
  bgKey?: string; // chosen background preset
  bgPhotoUrl?: string | null; // signed URL of a custom background photo
  bgOpacity?: number; // 0.15..1
  /** Partner pages: you watch, you don't draw. Disables the gesture entirely. */
  readOnly?: boolean;
  /** Hint shown on an empty read-only page ("their page is still blank…"). */
  readOnlyHint?: string;
  canvasRef?: ReturnType<typeof useCanvasRef>; // parent-owned, for share snapshots
  onBegin: (brush: Brush, color: string, width: number) => string;
  onPoint: (strokeId: string, pt: Point) => void;
  onEnd: (strokeId: string) => void;
}

const MIN_SEGMENT_PX = 1.5; // same point-thinning as the prototype

// Mobile browsers hijack touch-moves for page scrolling, chopping strokes into
// broken segments. touch-action:none tells the browser this surface owns the
// finger. Native ignores these (web-only style keys).
const WEB_TOUCH_FIX =
  Platform.OS === 'web'
    ? ({ touchAction: 'none', userSelect: 'none' } as unknown as object)
    : null;

/**
 * The shared canvas: a theme-gradient "photo" background with all persisted +
 * in-flight strokes on top, and finger drawing input.
 */
export function CanvasBoard({
  strokes,
  liveStrokes,
  brush,
  color,
  brushWidth,
  photoUrl,
  revealInvisible,
  prompt,
  seedId,
  bgKey,
  bgPhotoUrl,
  bgOpacity,
  readOnly,
  readOnlyHint,
  canvasRef,
  onBegin,
  onPoint,
  onEnd,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Ink bloom moves on a scale of days, so an hourly quantum keeps
  // StrokeRenderer's memo effective instead of re-rendering constantly.
  const bloomNowMs = Math.floor(Date.now() / 3_600_000) * 3_600_000;
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
      if (!size.w || readOnly) return;
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
        style={[styles.board, WEB_TOUCH_FIX]}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {w > 0 && (
          <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
            <CanvasBackdrop
              w={w}
              h={h}
              board={colors.board}
              photoUrl={photoUrl}
              bgKey={bgKey}
              bgPhotoUrl={bgPhotoUrl}
              bgOpacity={bgOpacity}
              seedId={seedId}
            />
            {/* invisible ink vanishes once landed; live strokes always show */}
            {strokes
              .filter((s) => s.brush !== 'invisible' || revealInvisible)
              .map((s) => (
                <StrokeRenderer key={s.id} stroke={s} width={w} height={h} nowMs={bloomNowMs} />
              ))}
            {Object.values(liveStrokes).map((s) => (
              <StrokeRenderer key={s.id} stroke={s} width={w} height={h} />
            ))}
          </Canvas>
        )}
        {!hasInk && (
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hint}>{readOnly ? (readOnlyHint ?? 'nothing here yet') : 'draw here ✏️'}</Text>
            {!readOnly && prompt ? <Text style={styles.prompt}>today: {prompt}</Text> : null}
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
      // reads over both light and dark canvas grounds
      color: colors.barStyle === 'dark' ? 'rgba(43,32,41,0.55)' : 'rgba(255,255,255,0.85)',
    },
    prompt: {
      fontFamily: fonts.handwritingMedium,
      fontSize: 21,
      marginTop: 6,
      paddingHorizontal: 24,
      textAlign: 'center',
      color: colors.barStyle === 'dark' ? 'rgba(43,32,41,0.45)' : 'rgba(255,255,255,0.65)',
    },
  });
