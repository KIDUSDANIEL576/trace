import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

/**
 * Makes push notifications actually go somewhere. Without this, tapping
 * "left you a trace ❤️" just opens the app on whatever screen it was last on —
 * a dead end. Now a tap routes to the canvas (via the index gate, which sends
 * a paired user straight there and an unpaired one to pairing).
 *
 * Handles both cases: the app was already running (listener), and the app was
 * fully closed and launched by the tap (getLastNotificationResponseAsync).
 */
export function useNotificationRouting(): void {
  useEffect(() => {
    let handled = false;
    const go = (response: Notifications.NotificationResponse | null) => {
      if (handled) return;
      handled = true;
      const open = response?.notification.request.content.data?.open;
      // "left you a trace" lands straight on their page, preview → the real thing
      router.replace(open === 'partner' ? '/canvas?open=partner' : '/');
    };

    // cold start: the tap that launched the app
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) go(response);
      })
      .catch(() => {});

    // warm: tapped while the app was backgrounded/foregrounded
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handled = false; // a fresh tap should route again
      go(response);
    });
    return () => sub.remove();
  }, []);
}
