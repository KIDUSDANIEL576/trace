import { Canvas } from '@shopify/react-native-skia';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import type { Stroke } from '@/types';
import { CanvasBackdrop } from './CanvasBackdrop';
import { StrokeRenderer } from './StrokeRenderer';

interface Props {
  strokes: Stroke[];
  photoUrl?: string | null;
  count: number; // how many strokes to show, in order
}

/** Read-only canvas for Relationship Replay: renders the first `count` strokes. */
export function ReplayBoard({ strokes, photoUrl, count }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;

  return (
    <View
      style={styles.board}
      onLayout={(e) =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      {w > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <CanvasBackdrop w={w} h={h} photoUrl={photoUrl} />
          {strokes.slice(0, count).map((s) => (
            <StrokeRenderer key={s.id} stroke={s} width={w} height={h} />
          ))}
        </Canvas>
      )}
    </View>
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
});
