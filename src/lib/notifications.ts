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
    if (!projectId) {
      // The #1 silent push failure: getExpoPushTokenAsync needs an EAS project
      // id. It's written to app.json by `eas init`. Make the cause loud instead
      // of swallowing it, so a dev build without eas init isn't a mystery.
      console.warn(
        '[trace] push disabled: no EAS projectId. Run `eas init` (writes ' +
          'expo.extra.eas.projectId to app.json), then rebuild.'
      );
      return;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await supabase
      .from(TABLES.pushTokens)
      .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
  } catch (e) {
    // Push is best-effort — drawing must work without it — but surface why.
    console.warn('[trace] push registration failed:', e instanceof Error ? e.message : e);
  }
}

/** Fire-and-forget: asks the edge function to notify the partner (throttled server-side). */
export function notifyPartner(coupleId: string, kind?: 'photo' | 'pulse' | 'capsule'): void {
  supabase.functions
    .invoke(EDGE_FUNCTIONS.notifyPartner, { body: { coupleId, kind } })
    .catch(() => {});
}
