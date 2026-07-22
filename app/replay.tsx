import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReplayBoard } from '@/components/ReplayBoard';
import { Loading, Screen, Wordmark } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { TABLES } from '@/lib/backend';
import { tapLight } from '@/lib/haptics';
import { signedPhotoUrl } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';
import type { Brush, Point, Stroke } from '@/types';

const FREE_REPLAY_STROKES = 20; // Trace Forever unlocks the full history

/** Relationship Replay: scrub through the canvas's strokes in the order they landed. */
export default function Replay() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { session, loading } = useAuth();
  const { membership } = useCouple(session?.user.id);
  const { canvasId, photoPath } = useLocalSearchParams<{ canvasId: string; photoPath?: string }>();
  const insets = useSafeAreaInsets();
  const premium = membership?.premium ?? false;

  const [allStrokes, setAllStrokes] = useState<Stroke[] | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [trackW, setTrackW] = useState(0);
  const [playing, setPlaying] = useState(false);

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
        setAllStrokes(loaded);
        setCount(loaded.length); // start fully drawn; scrub back to the beginning
      });
  }, [canvasId]);

  useEffect(() => {
    if (photoPath) signedPhotoUrl(photoPath).then(setPhotoUrl);
  }, [photoPath]);

  // autoplay: long stories compress to ~7s; short ones play stroke-by-stroke
  // (60–400ms per frame) so a small story still feels like a story
  useEffect(() => {
    if (!playing || !allStrokes) return;
    const totalNow = premium ? allStrokes.length : Math.min(allStrokes.length, FREE_REPLAY_STROKES);
    if (!totalNow) return;
    const step = Math.max(1, Math.round(totalNow / 120));
    const interval = Math.min(400, Math.max(60, Math.round(7000 / (totalNow / step))));
    const t = setInterval(() => {
      setCount((c) => Math.min(Math.min(c, totalNow) + step, totalNow));
    }, interval);
    return () => clearInterval(t);
  }, [playing, allStrokes, premium]);

  // reached the end → stop
  useEffect(() => {
    if (!playing || !allStrokes) return;
    const totalNow = premium ? allStrokes.length : Math.min(allStrokes.length, FREE_REPLAY_STROKES);
    if (count >= totalNow) setPlaying(false);
  }, [count, playing, allStrokes, premium]);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (!canvasId) return <Redirect href="/canvas" />;
  if (!allStrokes) return <Loading />;

  // free tier replays only the most recent strokes
  const strokes = premium ? allStrokes : allStrokes.slice(-FREE_REPLAY_STROKES);
  const capped = strokes.length < allStrokes.length;
  const total = strokes.length;
  // count is initialized to the FULL history length before premium resolves
  const shown = Math.min(count, total);
  const scrubTo = (x: number) => {
    if (!trackW || !total) return;
    setPlaying(false); // hands on the slider always win
    const frac = Math.min(1, Math.max(0, x / trackW));
    setCount(Math.round(frac * total));
  };

  function togglePlay() {
    tapLight();
    if (playing) {
      setPlaying(false);
      return;
    }
    if (shown >= total) setCount(0); // at the end: play again from stroke one
    setPlaying(true);
  }
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => scrubTo(e.x))
    .onUpdate((e) => scrubTo(e.x));

  const frac = total ? shown / total : 0;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Wordmark />
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Text style={styles.closeText}>Done</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Replay</Text>
      {total > 0 && (
        <Text style={styles.replayHint}>Watch your story draw itself, or drag to rewind.</Text>
      )}

      {capped && (
        <Pressable style={styles.upsell} onPress={() => router.push('/paywall')}>
          <Text style={styles.upsellText}>
            Replaying the last {FREE_REPLAY_STROKES} strokes · unlock your full story →
          </Text>
        </Pressable>
      )}

      <ReplayBoard strokes={strokes} photoUrl={photoUrl} count={shown} />

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
          <View style={styles.controls}>
            <Pressable
              onPress={togglePlay}
              accessibilityRole="button"
              accessibilityLabel={playing ? 'Pause replay' : 'Play your story'}
              style={({ pressed }) => [styles.playChip, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.playChipText}>{playing ? '⏸ Pause' : '▶ Play story'}</Text>
            </Pressable>
            <Text style={styles.label}>
              stroke {shown} / {total}
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
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
    marginBottom: 4,
  },
  replayHint: { color: colors.muted, fontSize: 14, marginBottom: 14 },
  trackHit: { justifyContent: 'center', paddingVertical: 22, marginTop: 12 },
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  playChip: {
    backgroundColor: colors.inkSoft,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
  },
  playChipText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 2 },
  empty: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 18 },
  upsell: {
    alignSelf: 'center',
    backgroundColor: colors.inkSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  upsellText: { color: '#ffb9c2', fontSize: 12.5, fontWeight: '500' },
});
