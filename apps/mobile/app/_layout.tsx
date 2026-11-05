import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { FetchLike } from '@sobra/client';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/api/AuthProvider';
import { connectOnlineManager } from '../src/api/network';
import { createServices, DEFAULT_API_URL } from '../src/api/services';
import { ServicesProvider } from '../src/api/ServicesProvider';
import { storage } from '../src/lib/storage';
import { createTokenStore } from '../src/lib/tokenStore';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});
connectOnlineManager();

/*
 * Development only: the break-ui scenarios (Ajustes) answer through this fetch. The requires sit
 * inside `if (__DEV__)`: Metro folds `__DEV__` to false before collecting dependencies, so the
 * scenario data and its toggle are not in release bundles at all.
 */
const devOptions: { fetch?: FetchLike } = {};
if (__DEV__) {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const scenarios = require('../src/dev/scenarios') as typeof import('../src/dev/scenarios');
  const settings = require('../src/dev/DevSettings') as typeof import('../src/dev/DevSettings');
  /* eslint-enable @typescript-eslint/no-require-imports */
  devOptions.fetch = scenarios.createScenarioFetch(fetch as unknown as FetchLike);
  settings.restoreDevSettings().catch(() => {});
}

const services = createServices({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
  tokenStore: createTokenStore(storage),
  ...devOptions,
});

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const theme = useTheme();
  const { status } = useAuth();
  const reduced = useReducedMotion();
  const ready = fontsReady && status !== 'checking';

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg.canvas).catch(() => {});
  }, [theme]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // '/' belongs to the protected tabs: a signed-out visit (or an expired session) lands on sign-in.
  const segments = useSegments();
  const router = useRouter();
  const inAuth = segments[0] === '(auth)';
  useEffect(() => {
    if (ready && status === 'signedOut' && !inAuth) router.replace('/entrar');
  }, [ready, status, inAuth, router]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reduced ? 'fade' : 'default',
          contentStyle: { backgroundColor: theme.colors.bg.canvas },
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold });
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ServicesProvider services={services}>
            <AuthProvider>
              <RootNavigator fontsReady={loaded || error !== null} />
            </AuthProvider>
          </ServicesProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
