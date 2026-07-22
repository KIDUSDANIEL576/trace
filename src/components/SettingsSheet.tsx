import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { PALETTES, radius, THEME_LABELS, THEME_ORDER, type Palette } from '@/theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onLeaveCouple: () => void;
  onDelete: () => void;
}

/**
 * Bottom-sheet settings. The appearance picker changes the theme live (tap a
 * look and the sheet itself re-colours), and it avoids Android's 3-button
 * Alert limit that a menu this size would hit.
 */
export function SettingsSheet({ visible, onClose, onSignOut, onLeaveCouple, onDelete }: Props) {
  const { colors, theme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.grab} />
          <Text style={styles.title}>Settings</Text>

          <Text style={styles.section}>APPEARANCE</Text>
          {THEME_ORDER.map((t) => {
            const p = PALETTES[t];
            const on = t === theme;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  tapLight();
                  setTheme(t);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${THEME_LABELS[t]} theme`}
                style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
              >
                <View style={styles.dots}>
                  <View style={[styles.dot, { backgroundColor: p.night }]} />
                  <View style={[styles.dot, { backgroundColor: p.ink }]} />
                  <View style={[styles.dot, { backgroundColor: p.gold }]} />
                </View>
                <Text style={styles.rowLabel}>{THEME_LABELS[t]}</Text>
                {on ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}

          <View style={styles.divider} />

          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.actionText}>Sign out</Text>
          </Pressable>
          <Pressable
            onPress={onLeaveCouple}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Leave this couple"
          >
            <Text style={styles.deleteText}>Leave this couple…</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}
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
    title: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 18 },
    section: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 13,
      paddingHorizontal: 14,
      borderRadius: radius.button,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.panel2,
      marginBottom: 9,
    },
    rowOn: { borderColor: colors.ink, backgroundColor: colors.inkSoft },
    pressed: { opacity: 0.7 },
    dots: { flexDirection: 'row', gap: 5 },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: 'rgba(128,128,128,0.35)',
    },
    rowLabel: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '500' },
    check: { color: colors.ink, fontSize: 17, fontWeight: '800' },
    divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
    action: { paddingVertical: 14, alignItems: 'center' },
    actionText: { color: colors.text, fontSize: 16, fontWeight: '500' },
    deleteText: { color: colors.muted, fontSize: 14.5 },
    done: {
      marginTop: 8,
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
