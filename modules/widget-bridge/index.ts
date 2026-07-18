import { requireNativeModule } from 'expo-modules-core';

interface WidgetBridge {
  setSnapshot(url: string): void;
}

// Widgets need a dev build; in Expo Go (or web) the module is absent → no-op.
let native: WidgetBridge | null = null;
try {
  native = requireNativeModule<WidgetBridge>('WidgetBridge');
} catch {
  native = null;
}

/** Hands the widgets a fresh signed snapshot URL and asks them to reload. */
export function setWidgetSnapshot(url: string): void {
  native?.setSnapshot(url);
}
