import * as Haptics from 'expo-haptics';

/**
 * Tiny wrappers around expo-haptics — the small physical taps that make an
 * app feel alive and "Apple-like". All no-op safely on web / unsupported
 * devices, so call them freely without guarding.
 */
export const tapLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const tapMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const notifySuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
export const notifyWarn = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
