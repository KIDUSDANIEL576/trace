import { Caveat_500Medium, Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Everything under the theme: root background, status bar, and screens. */
function Shell() {
  const { colors } = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.night }}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={colors.barStyle} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.night },
              animation: 'fade',
            }}
          />
        </ToastProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
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
