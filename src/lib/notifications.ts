import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EDGE_FUNCTIONS, TABLES } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Registers for Expo push and stores the token so the notify-partner edge
 * function can reach this device. No-ops quietly on simulators/Expo Go,
 * where remote push isn't available.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('traces', {
        name: 'Traces',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#e23343',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await supabase
      .from(TABLES.pushTokens)
      .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
  } catch {
    // Push is best-effort in Phase 1 — drawing must work without it.
  }
}

/** Fire-and-forget: asks the edge function to notify the partner (throttled server-side). */
export function notifyPartner(coupleId: string, kind?: 'photo'): void {
  supabase.functions
    .invoke(EDGE_FUNCTIONS.notifyPartner, { body: { coupleId, kind } })
    .catch(() => {});
}
