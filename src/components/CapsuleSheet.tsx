import { Canvas } from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, type Palette } from '@/theme/tokens';
import type { CapsuleMeta, CapsuleStroke, Stroke } from '@/types';
import { CanvasBackdrop } from './CanvasBackdrop';
import { StrokeRenderer } from './StrokeRenderer';

// Time-capsule durations. Coarse presets on purpose — picking an exact
// datetime turns a romantic gesture into a form.
const PRESETS: { label: string; days: number }[] = [
  { label: 'In a week', days: 7 },
  { label: 'In a month', days: 30 },
  { label: 'In a year', days: 365 },
  { label: 'In 5 years', days: 1826 },
];

interface SealProps {
  visible: boolean;
  strokeCount: number;
  onClose: () => void;
  onSeal: (opensAt: Date, note: string) => void;
}

/** Bottom sheet: seal the current canvas until a chosen date. */
export function SealCapsuleSheet({ visible, strokeCount, onClose, onSeal }: SealProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [preset, setPreset] = useState(1); // default: in a month
  const [note, setNote] = useState('');

  function seal() {
    tapLight();
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + PRESETS[preset].days);
    onSeal(d, note);
    setNote('');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.grab} />
          <Text style={styles.title}>Seal this drawing ⏳</Text>
          <Text style={styles.subtitle}>
            The canvas as it is right now — {strokeCount} stroke{strokeCount === 1 ? '' : 's'} —
            locked away until the day it opens. Not even you can peek.
          </Text>

          <Text style={styles.section}>OPENS</Text>
          <View style={styles.presetRow}>
            {PRESETS.map((p, i) => {
              const on = i === preset;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => {
                    tapLight();
                    setPreset(i);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.preset, on && styles.presetOn]}
                >
                  <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>A NOTE FOR THE FUTURE (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="we drew this the week we…"
            placeholderTextColor={colors.muted}
            maxLength={120}
            style={styles.noteInput}
            accessibilityLabel="Note for the future"
          />

          <Pressable
            onPress={seal}
            accessibilityRole="button"
            accessibilityLabel="Seal the capsule"
            style={({ pressed }) => [styles.sealBtn, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.sealBtnText}>Seal it 🎁</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface OpenProps {
  capsule: CapsuleMeta | null; // null = closed
  strokes: CapsuleStroke[] | null;
  authorName: string;
  onClose: () => void;
}

/** Full-screen moment: an unsealed capsule replaying its drawing. */
export function OpenCapsuleModal({ capsule, strokes, authorName, onClose }: OpenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const asStrokes: Stroke[] = useMemo(
    () =>
      (strokes ?? []).map((s, i) => ({
        id: `capsule-${i}`,
        authorId: '',
        brush: s.brush,
        color: s.color,
        width: s.width,
        points: s.points,
      })),
    [strokes]
  );

  const sealedOn = capsule
    ? new Date(capsule.createdAt).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Modal visible={capsule != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.openBackdrop}>
        <Text style={styles.openTitle}>from {authorName} 🎁</Text>
        <Text style={styles.openSub}>sealed on {sealedOn}</Text>
        <View
          style={styles.openBoard}
          onLayout={(e) =>
            setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
        >
          {size.w > 0 && (
            <Canvas style={StyleSheet.absoluteFill}>
              <CanvasBackdrop w={size.w} h={size.h} board={colors.board} photoUrl={null} />
              {asStrokes.map((s) => (
                <StrokeRenderer key={s.id} stroke={s} width={size.w} height={size.h} />
              ))}
            </Canvas>
          )}
        </View>
        {capsule?.note ? <Text style={styles.openNote}>“{capsule.note}”</Text> : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close capsule"
          style={({ pressed }) => [styles.openDone, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.openDoneText}>Keep it forever ❤️</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.panel,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    grab: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.muted,
      opacity: 0.5,
      alignSelf: 'center',
      marginBottom: 14,
    },
    title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 6 },
    subtitle: { color: colors.muted, fontSize: 13.5, lineHeight: 20, marginBottom: 18 },
    section: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 10,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    preset: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel2,
      borderRadius: radius.pill,
      paddingVertical: 9,
      paddingHorizontal: 14,
    },
    presetOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
    presetText: { color: colors.muted, fontSize: 13.5, fontWeight: '600' },
    presetTextOn: { color: colors.ink },
    noteInput: {
      backgroundColor: colors.panel2,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.button,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: colors.text,
      fontSize: 15,
      marginBottom: 18,
    },
    sealBtn: {
      minHeight: 52,
      borderRadius: radius.button,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sealBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    openBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.88)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    openTitle: { fontFamily: fonts.handwriting, fontSize: 34, color: '#fff' },
    openSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4, marginBottom: 18 },
    openBoard: {
      alignSelf: 'stretch',
      aspectRatio: 1 / 1.1,
      borderRadius: radius.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    openNote: {
      fontFamily: fonts.handwritingMedium,
      fontSize: 22,
      color: '#fff',
      marginTop: 18,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    openDone: {
      marginTop: 22,
      backgroundColor: colors.ink,
      borderRadius: radius.button,
      paddingVertical: 14,
      paddingHorizontal: 28,
    },
    openDoneText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  });
