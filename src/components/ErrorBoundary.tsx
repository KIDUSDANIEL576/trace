import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Deliberately the static dusk palette, NOT useTheme(): this fallback has to
// render even when the failure is inside ThemeProvider itself, so it must not
// depend on any React context.
import { colors, fonts, radius } from '@/theme/tokens';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * App-wide safety net. Without it, any render error unmounts the whole tree to
 * a blank screen with no way back and no signal to us. This catches it, shows a
 * calm, plain-language recovery screen, and logs the crash. `reportCrash` is the
 * single seam where a crash reporter (Sentry) plugs in later — see ROADMAP Tier 2.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportCrash(error, info.componentStack ?? undefined);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>a little hiccup</Text>
          <Text style={styles.body}>
            Something didn’t load right. Your drawings are safe — nothing was lost.
          </Text>
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

/** One place for crash telemetry. Console today; wire Sentry here when ready. */
function reportCrash(error: Error, componentStack?: string): void {
  console.error('[trace] uncaught render error:', error.message, componentStack ?? '');
  // TODO(Tier 2): Sentry.Native.captureException(error, { extra: { componentStack } });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 28,
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.handwriting,
    fontSize: 30,
    color: colors.text,
    marginBottom: 10,
  },
  body: {
    color: colors.muted,
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 22,
  },
  button: {
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingVertical: 15,
    paddingHorizontal: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});
