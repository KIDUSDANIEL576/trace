import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapLight } from '@/lib/haptics';
import {
  BACKGROUNDS,
  backgroundByKey,
  clampBgOpacity,
  FAMILY_LABELS,
  FAMILY_ORDER,
  isSkyFree,
  type BackgroundFamily,
} from '@/theme/backgrounds';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Palette } from '@/theme/tokens';
import { GlassFill } from './Glass';

const MIN_OPACITY = 0.15;

interface Props {
  visible: boolean;
  bgKey: string;
  bgOpacity: number;
  hasCustomPhoto: boolean;
  busy?: boolean;
  /** Trace Forever unlocks every sky and custom photo backgrounds. */
  premium: boolean;
  onClose: () => void;
  onPick: (key: string) => void;
  onOpacity: (value: number) => void;
  onPickPhoto: () => void;
  onClearPhoto: () => void;
  /** A locked sky or the photo option was tapped → open the paywall. */
  onLocked: () => void;
}

/** A little Skia preview of one preset — the real gradient, not an approximation. */
function Swatch({ colors, positions }: { colors: string[]; positions: number[] }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) =>
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
      }
    >
      {size.w > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={size.w} height={size.h}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, size.h)}
              colors={colors}
              positions={positions}
            />
          </Rect>
        </Canvas>
      )}
    </View>
  );
}

/**
 * Pick the sky you draw on: a grid of romantic presets, your own photo, and a
 * strength slider so the background can sit as a whisper behind the ink.
 * Whatever you choose lands on your partner's canvas live.
 */
export function BackgroundSheet({
  visible,
  bgKey,
  bgOpacity,
  hasCustomPhoto,
  busy,
  premium,
  onClose,
  onPick,
  onOpacity,
  onPickPhoto,
  onClearPhoto,
  onLocked,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [trackW, setTrackW] = useState(0);
  const [dragging, setDragging] = useState(clampBgOpacity(bgOpacity));
  // open on the tab holding the current sky, so you land where you left off
  const [family, setFamily] = useState<BackgroundFamily>(
    () => backgroundByKey(bgKey).family
  );
  const shownSkies = useMemo(
    () => BACKGROUNDS.filter((b) => b.family === family),
    [family]
  );

  // keep the slider in step when the partner changes it while the sheet is open
  const shown = dragging;

  const setFromX = (x: number) => {
    if (!trackW) return;
    const ratio = Math.min(1, Math.max(0, x / trackW));
    const value = MIN_OPACITY + ratio * (1 - MIN_OPACITY);
    setDragging(value);
    return value;
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => setFromX(e.x))
    .onUpdate((e) => setFromX(e.x))
    .onFinalize((e) => {
      const v = setFromX(e.x);
      if (v != null) onOpacity(v);
    });

  const fillRatio = (shown - MIN_OPACITY) / (1 - MIN_OPACITY);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close backgrounds">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <GlassFill strong />
          <View style={styles.grab} />
          <Text style={styles.title}>Your canvas sky</Text>
          <Text style={styles.subtitle}>
            Pick a background — your person sees it change too.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabStrip}
            contentContainerStyle={styles.tabStripContent}
          >
            {FAMILY_ORDER.map((f) => {
              const on = f === family;
              const count = BACKGROUNDS.filter((b) => b.family === f).length;
              return (
                <Pressable
                  key={f}
                  onPress={() => {
                    tapLight();
                    setFamily(f);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${FAMILY_LABELS[f]}, ${count} backgrounds`}
                  style={({ pressed }) => [
                    styles.tab,
                    on && styles.tabOn,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.tabText, on && styles.tabTextOn]}>{FAMILY_LABELS[f]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
            {shownSkies.map((b) => {
              const on = !hasCustomPhoto && b.key === bgKey;
              const locked = !premium && !isSkyFree(b.key);
              return (
                <Pressable
                  key={b.key}
                  onPress={() => {
                    tapLight();
                    if (locked) onLocked();
                    else onPick(b.key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={
                    locked ? `${b.label} background, locked` : `${b.label} background`
                  }
                  style={({ pressed }) => [
                    styles.tile,
                    on && styles.tileOn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Swatch colors={b.colors} positions={b.positions} />
                  {/* locked skies still show their real colours — you can see
                      exactly what you'd unlock, just dimmed */}
                  {locked && <View style={styles.tileLockScrim} />}
                  <View style={styles.tileLabelWrap}>
                    <Text style={styles.tileLabel}>{b.label}</Text>
                  </View>
                  {on ? <Text style={styles.tileCheck}>✓</Text> : null}
                  {locked ? <Text style={styles.tileLock}>🔒</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.section}>STRENGTH</Text>
          <GestureDetector gesture={pan}>
            <View
              style={styles.sliderHit}
              accessibilityRole="adjustable"
              accessibilityLabel="Background strength"
              accessibilityValue={{ min: 15, max: 100, now: Math.round(shown * 100) }}
              onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
            >
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.round(fillRatio * 100)}%` }]} />
              </View>
              <View style={[styles.knob, { left: `${Math.round(fillRatio * 100)}%` }]} />
            </View>
          </GestureDetector>
          <Text style={styles.sliderValue}>{Math.round(shown * 100)}%</Text>

          <View style={styles.photoRow}>
            <Pressable
              onPress={() => {
                tapLight();
                if (!premium) onLocked();
                else onPickPhoto();
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={
                premium
                  ? 'Use one of my photos as the background'
                  : 'Use one of my photos as the background, locked'
              }
              style={({ pressed }) => [
                styles.photoBtn,
                hasCustomPhoto && styles.photoBtnOn,
                (pressed || busy) && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.photoBtnText}>
                {busy
                  ? 'Setting…'
                  : hasCustomPhoto
                    ? '✓ Your photo'
                    : premium
                      ? '📷 Use my photo'
                      : '🔒 Use my photo'}
              </Text>
            </Pressable>
            {hasCustomPhoto ? (
              <Pressable
                onPress={() => {
                  tapLight();
                  onClearPhoto();
                }}
                accessibilityRole="button"
                accessibilityLabel="Remove the background photo"
                style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.clearText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.done, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth * 1.5,
      borderColor: colors.glass.border,
      overflow: 'hidden',
      paddingHorizontal: 20,
      paddingTop: 10,
      maxHeight: '88%',
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
    title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: colors.muted, fontSize: 13.5, marginBottom: 16 },
    section: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 10,
    },
    tabStrip: { flexGrow: 0, marginBottom: 12 },
    tabStripContent: { gap: 8 },
    tab: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel2,
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 15,
    },
    tabOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
    tabText: { color: colors.muted, fontSize: 13.5, fontWeight: '600' },
    tabTextOn: { color: colors.inkText },
    gridScroll: { maxHeight: 250 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 4 },
    tile: {
      width: '30.5%',
      aspectRatio: 0.82,
      borderRadius: radius.tool,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.line,
      justifyContent: 'flex-end',
    },
    tileOn: { borderColor: colors.ink },
    tileLabelWrap: { backgroundColor: 'rgba(0,0,0,0.42)', paddingVertical: 4 },
    tileLabel: { color: '#fff', fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
    tileCheck: {
      position: 'absolute',
      top: 5,
      right: 7,
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },
    tileLockScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,7,11,0.45)' },
    tileLock: { position: 'absolute', top: 5, right: 6, fontSize: 13 },
    sliderHit: { height: 44, justifyContent: 'center' },
    track: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.panel2,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    trackFill: { height: '100%', backgroundColor: colors.ink },
    knob: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: colors.ink,
      marginLeft: -12,
    },
    sliderValue: {
      color: colors.muted,
      fontSize: 12.5,
      textAlign: 'right',
      marginTop: 2,
      marginBottom: 14,
    },
    photoRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
    photoBtn: {
      flex: 1,
      minHeight: 50,
      borderRadius: radius.button,
      backgroundColor: colors.panel2,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoBtnOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
    photoBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
    clearBtn: {
      paddingHorizontal: 16,
      minHeight: 50,
      borderRadius: radius.button,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearText: { color: colors.muted, fontSize: 14 },
    done: {
      marginTop: 10,
      minHeight: 52,
      borderRadius: radius.button,
      backgroundColor: colors.panel2,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  });
