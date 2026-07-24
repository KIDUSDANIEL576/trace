import { BlurMask, Path } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { buildSmoothPath } from '@/lib/geometry';
import { bloomScale } from '@/lib/livingInk';
import type { Stroke } from '@/types';

interface Props {
  stroke: Stroke;
  width: number; // canvas px width
  height: number; // canvas px height
  nowMs?: number; // Presence Painting: enables ink bloom for aged strokes
}

/** Renders one stroke with its brush character (matches the prototype's canvas brushes). */
export const StrokeRenderer = React.memo(function StrokeRenderer({
  stroke,
  width,
  height,
  nowMs,
}: Props) {
  const path = useMemo(
    () => buildSmoothPath(stroke.points, width, height),
    // points array is append-only, so length is a sufficient dependency
    [stroke.points.length, stroke.points, width, height]
  );

  if (stroke.points.length < 2) return null;

  const bloom = nowMs && stroke.createdAt ? bloomScale(stroke.createdAt, nowMs) : 1;
  const w = stroke.width * width * bloom;
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
    case 'invisible':
      // silvery shimmer, shown only while drawing / revealing (filtered upstream)
      return (
        <>
          <Path {...common} color="#ffffff" strokeWidth={w * 2.2} opacity={0.22}>
            <BlurMask blur={8} style="normal" />
          </Path>
          <Path {...common} color="#ffffff" strokeWidth={w} opacity={0.5} />
        </>
      );
  }
});
