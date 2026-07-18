import {
  Image as SkiaImage,
  LinearGradient,
  RadialGradient,
  Rect,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import React from 'react';

interface Props {
  w: number;
  h: number;
  photoUrl?: string | null;
}

/**
 * Canvas ground layer. Photo canvases render the photo (cover-fit); the shared
 * canvas keeps the dusk "photo" gradient from the prototype — multiply-blend
 * marker ink needs a light ground either way. Falls back to the gradient
 * while a photo is still loading.
 */
export function CanvasBackdrop({ w, h, photoUrl }: Props) {
  const image = useImage(photoUrl ?? null);

  if (photoUrl && image) {
    return <SkiaImage image={image} fit="cover" x={0} y={0} width={w} height={h} />;
  }

  return (
    <>
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, h)}
          colors={['#33445f', '#5c5f78', '#8a6b73', '#2e2733']}
          positions={[0, 0.45, 0.7, 1]}
        />
      </Rect>
      <Rect x={0} y={0} width={w} height={h}>
        <RadialGradient
          c={vec(w * 0.7, h * 0.18)}
          r={w * 0.62}
          colors={['rgba(247,217,176,0.85)', 'rgba(247,217,176,0)']}
        />
      </Rect>
    </>
  );
}
