import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapLight } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, type Palette } from '@/theme/tokens';
import { GlassFill } from './Glass';

export interface MoreAction {
  key: string;
  icon: string;
  label: string;
  sub?: string;
  destructive?: boolean;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  actions: MoreAction[];
  onClose: () => void;
}

/** The ⋯ menu — everything that used to crowd the canvas, one calm sheet. */
export function MoreSheet({ visible, actions, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <GlassFill strong />
          <View style={styles.grab} />
          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => {
                tapLight();
                onClose();
                // let the sheet finish closing before whatever comes next opens
                setTimeout(a.onPress, 120);
              }}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.icon}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, a.destructive && styles.destructive]}>{a.label}</Text>
                {a.sub ? <Text style={styles.sub}>{a.sub}</Text> : null}
              </View>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => [styles.done, pressed && styles.pressed]}
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
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    grab: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.muted,
      opacity: 0.5,
      alignSelf: 'center',
      marginBottom: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 13,
      paddingHorizontal: 10,
      borderRadius: radius.button,
    },
    pressed: { opacity: 0.7 },
    icon: { fontSize: 21, width: 30, textAlign: 'center' },
    label: { color: colors.text, fontSize: 16, fontWeight: '500' },
    sub: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
    destructive: { color: colors.ink },
    done: {
      marginTop: 8,
      minHeight: 50,
      borderRadius: radius.button,
      backgroundColor: colors.glass.wellIdle,
      borderWidth: 1,
      borderColor: colors.glass.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  });
