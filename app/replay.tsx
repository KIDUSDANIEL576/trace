import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReplayBoard } from '@/components/ReplayBoard';
import { Loading, Screen, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { TABLES } from '@/lib/backend';
import { signedPhotoUrl } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/theme/tokens';
import type { Brush, Point, Stroke } from '@/types';

/** Relationship Replay: scrub through the canvas's strokes in the order they landed. */
export default function Replay() {
  const { session, loading } = useAuth();
  const { canvasId, photoPath } = useLocalSearchParams<{ canvasId: string; photoPath?: string }>();
  const insets = useSafeAreaInsets();

  const [strokes, setStrokes] = useState<Stroke[] | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    if (!canvasId) return;
    supabase
      .from(TABLES.strokes)
      .select('id, author_id, brush, color, width, points')
      .eq('canvas_id', canvasId)
      .order('id', { ascending: true })
      .then(({ data }) => {
        const loaded: Stroke[] = (data ?? []).map((row) => ({
          id: `db-${row.id}`,
          dbId: row.id,
          authorId: row.author_id,
          brush: row.brush as Brush,
          color: row.color,
          width: row.width,
          points: row.points as Point[],
        }));
        setStrokes(loaded);
        setCount(loaded.length); // start fully drawn; scrub back to the beginning
      });
  }, [canvasId]);

  useEffect(() => {
    if (photoPath) signedPhotoUrl(photoPath).then(setPhotoUrl);
  }, [photoPath]);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!canvasId) return <Redirect href="/canvas" />;
  if (!strokes) return <Loading />;

  const total = strokes.length;
  const scrubTo = (x: number) => {
    if (!trackW || !total) return;
    const frac = Math.min(1, Math.max(0, x / trackW));
    setCount(Math.round(frac * total));
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => scrubTo(e.x))
    .onUpdate((e) => scrubTo(e.x));

  const frac = total ? count / total : 0;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Wordmark />
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Replay</Text>

      <ReplayBoard strokes={strokes} photoUrl={photoUrl} count={count} />

      {total === 0 ? (
        <Text style={styles.empty}>Nothing here yet — go draw something first.</Text>
      ) : (
        <>
          <GestureDetector gesture={pan}>
            <View style={styles.trackHit} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${frac * 100}%` }]} />
              </View>
              <View style={[styles.thumb, { left: Math.max(0, frac * trackW - 11) }]} />
            </View>
          </GestureDetector>
          <Text style={styles.label}>
            stroke {count} / {total}
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  close: { padding: 8 },
  closeText: { color: colors.glow, fontSize: 14.5, fontWeight: '500' },
  title: {
    fontFamily: fonts.handwriting,
    fontSize: 34,
    color: colors.text,
    marginBottom: 12,
  },
  trackHit: { justifyContent: 'center', paddingVertical: 18, marginTop: 10 },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.ink },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },
  empty: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 18 },
});
