import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * Call once at module load, before anything renders. No-ops until
 * EXPO_PUBLIC_SENTRY_DSN is set (see SENTRY_SETUP.md) — safe to leave wired in
 * every build, dev or prod.
 */
export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
  });
}

/** The single seam for reporting a caught error — ErrorBoundary's only caller. */
export function captureException(error: unknown, extra?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}

/** Wraps the root component for native crash context; identity fn until DSN is set. */
export function wrapRootComponent<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return DSN
    ? (Sentry.wrap(Component as ComponentType<Record<string, unknown>>) as ComponentType<P>)
    : Component;
}
