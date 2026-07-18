import { BlurMask, Path } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { buildSmoothPath } from '@/lib/geometry';
import type { Stroke } from '@/types';

interface Props {
  stroke: Stroke;
  width: number; // canvas px width
  height: number; // canvas px height
}

/** Renders one stroke with its brush character (matches the prototype's canvas brushes). */
export const StrokeRenderer = React.memo(function StrokeRenderer({ stroke, width, height }: Props) {
  const path = useMemo(
    () => buildSmoothPath(stroke.points, width, height),
    // points array is append-only, so length is a sufficient dependency
    [stroke.points.length, stroke.points, width, height]
  );

  if (stroke.points.length < 2) return null;

  const w = stroke.width * width;
  const common = {
    path,
    style: 'stroke' as const,
    strokeCap: 'round' as const,
    strokeJoin: 'round' as const,
  };

  switch (stroke.brush) {
    case 'marker':
      return (
        <Path
          {...common}
          color={stroke.color}
          strokeWidth={w}
          opacity={0.78}
          blendMode="multiply"
        />
      );
    case 'glow':
      return (
        <>
          <Path {...common} color={stroke.color} strokeWidth={w * 2.4} opacity={0.8}>
            <BlurMask blur={10} style="normal" />
          </Path>
          <Path {...common} color={stroke.color} strokeWidth={w} />
        </>
      );
    case 'neon':
      return (
        <>
          <Path {...common} color={stroke.color} strokeWidth={w * 3.2}>
            <BlurMask blur={12} style="normal" />
          </Path>
          <Path {...common} color="#ffffff" strokeWidth={w} />
        </>
      );
    case 'chalk':
      return <Path {...common} color={stroke.color} strokeWidth={w} opacity={0.55} />;
  }
});
