import { Platform } from 'react-native';
import type PurchasesType from 'react-native-purchases';

// Trace Forever — $29.99 one-time, unlocks for both partners. The purchase is
// granted to the couple by the revenuecat-webhook edge function; the client
// just runs the store flow. Everything here no-ops without native code
// (Expo Go) or without API keys configured.

let Purchases: typeof PurchasesType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Purchases = require('react-native-purchases').default;
} catch {
  Purchases = null;
}

const FALLBACK_PRICE = '$29.99';
let configuredUserId: string | null = null;

function apiKey(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
}

/**
 * Ties purchases to the Supabase user id so the webhook can find the couple.
 * On account switch we log the SDK into the new user — otherwise a purchase
 * would credit the previous user's couple.
 */
export function configurePurchases(userId: string): void {
  const key = apiKey();
  if (!Purchases || !key || configuredUserId === userId) return;
  try {
    if (configuredUserId === null) {
      Purchases.configure({ apiKey: key, appUserID: userId });
    } else {
      Purchases.logIn(userId).catch(() => {});
    }
    configuredUserId = userId;
  } catch {
    // native module unavailable (Expo Go) — paywall will show setup hint
  }
}

export function purchasesAvailable(): boolean {
  return configuredUserId !== null;
}

/** Localized store price of the Trace Forever package (fallback when offline). */
export async function foreverPrice(): Promise<string> {
  if (!Purchases || configuredUserId === null) return FALLBACK_PRICE;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages[0]?.product.priceString ?? FALLBACK_PRICE;
  } catch {
    return FALLBACK_PRICE;
  }
}

/** Runs the store purchase flow. Resolves true when the purchase went through. */
export async function purchaseForever(): Promise<boolean> {
  if (!Purchases || configuredUserId === null) return false;
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages[0];
    if (!pkg) return false;
    await Purchases.purchasePackage(pkg);
    return true;
  } catch {
    return false; // cancelled or failed
  }
}

/** Restore a previous purchase (reinstall / new phone). */
export async function restoreForever(): Promise<boolean> {
  if (!Purchases || configuredUserId === null) return false;
  try {
    const info = await Purchases.restorePurchases();
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}
