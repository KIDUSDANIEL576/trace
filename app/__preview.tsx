import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { backgroundByKey } from '@/theme/backgrounds';
import { CanvasDock } from '@/components/CanvasDock';
import { Glass } from '@/components/Glass';
import { PresencePill } from '@/components/PresencePill';
import { Wordmark } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, THEME_ORDER } from '@/theme/tokens';
import type { Brush } from '@/types';

/**
 * A design harness — NOT part of the product.
 *
 * The glass chrome is the one thing that can't be judged from source: blur,
 * tint and contrast only exist once something renders them. This route draws
 * the real components (CanvasDock, Glass, PresencePill) over a real sky with
 * mock props and no backend, so the design can be exported to the web and
 * actually looked at. Reachable only at /__preview; nothing links to it.
 */
export default function Preview() {
  const { colors, theme, setTheme } = useTheme();
  const [brush, setBrush] = useState<Brush>('marker');
  const [color, setColor] = useState('#e23343');
  const sky = backgroundByKey('sunset');

  return (
    <View style={[styles.root, { backgroundColor: colors.night }]}>
      {/* Skia's WASM doesn't load in a plain web export, and the glass doesn't
          need it: the sky is approximated as bands of the real preset's stops,
          which is all that matters for judging blur, tint and legibility. */}
      <View style={StyleSheet.absoluteFill}>
        {sky.colors.map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Wordmark size={24} />
          <Text style={[styles.streak, { color: colors.onGold, backgroundColor: colors.gold }]}>
            🔥 3
          </Text>
          <Glass radius={radius.pill} contentStyle={styles.chip}>
            <Text style={{ color: colors.onOverlay, fontSize: 12.5 }}>with your person</Text>
          </Glass>
        </View>

        <PresencePill name="Kidus" />

        <Glass radius={radius.pill} style={styles.tabs} contentStyle={styles.tabsPad}>
          <ScrollView horizontal contentContainerStyle={{ gap: 4 }}>
            {['us', '✍️ my page', '💌 their page'].map((label, i) => (
              <Pressable
                key={label}
                style={[
                  styles.tab,
                  i === 0 && { backgroundColor: colors.inkSoft, borderWidth: 1, borderColor: colors.ink },
                ]}
              >
                <Text
                  style={{
                    color: colors.onOverlay,
                    fontSize: 13.5,
                    fontWeight: i === 0 ? '700' : '500',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Glass>

        <Glass
          radius={radius.pill}
          glow
          style={styles.pill}
          contentStyle={[styles.pillPad, { backgroundColor: colors.gold }]}
        >
          <Text style={{ color: colors.onGold, fontSize: 12.5, fontWeight: '700' }}>
            🎁 a time capsule is ready — tap to open
          </Text>
        </Glass>

        <View style={{ flex: 1 }} />

        <View style={styles.themes}>
          {THEME_ORDER.map((t) => (
            <Pressable key={t} onPress={() => setTheme(t)}>
              <Glass
                radius={radius.pill}
                contentStyle={styles.themeBtn}
                style={t === theme ? { opacity: 1 } : { opacity: 0.6 }}
              >
                <Text style={{ color: colors.onOverlay, fontSize: 12 }}>{t}</Text>
              </Glass>
            </Pressable>
          ))}
        </View>

        <CanvasDock
          brush={brush}
          color={color}
          premium={false}
          canUndo
          onBrush={setBrush}
          onColor={setColor}
          onLockedBrush={() => {}}
          onHeart={() => {}}
          onUndo={() => {}}
          onMore={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  content: { flex: 1, paddingHorizontal: 14, paddingTop: 40, paddingBottom: 20, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streak: {
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chip: { paddingVertical: 7, paddingHorizontal: 13 },
  tabs: { alignSelf: 'center', maxWidth: '100%' },
  tabsPad: { padding: 4 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill },
  pill: { alignSelf: 'center' },
  pillPad: { paddingVertical: 6, paddingHorizontal: 15 },
  themes: { flexDirection: 'row', gap: 8, alignSelf: 'center' },
  themeBtn: { paddingVertical: 6, paddingHorizontal: 14 },
});
