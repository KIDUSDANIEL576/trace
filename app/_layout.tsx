import { Caveat_500Medium, Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/hooks/useAuth';
import { initSentry, wrapRootComponent } from '@/lib/sentry';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});
initSentry(); // no-op until EXPO_PUBLIC_SENTRY_DSN is set — SENTRY_SETUP.md

/** Everything under the theme: root background, status bar, and screens. */
function Shell() {
  const { theme, colors } = useTheme();
  // theme switches cross-fade instead of snapping: quick dip while every
  // makeStyles(colors) re-evaluates, then ease back in over the new palette
  const fade = useRef(new Animated.Value(1)).current;
  const firstTheme = useRef(true);
  useEffect(() => {
    if (firstTheme.current) {
      firstTheme.current = false;
      return;
    }
    fade.setValue(0.35);
    Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [theme, fade]);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.night }}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={colors.barStyle} />
          <Animated.View style={{ flex: 1, opacity: fade }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.night },
                animation: 'fade',
              }}
            />
          </Animated.View>
        </ToastProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Caveat_500Medium, Caveat_700Bold });
  const ready = fontsLoaded || fontError != null; // never hang on a font failure

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default wrapRootComponent(RootLayout);
