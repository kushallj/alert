import { SplashScreen, Stack, usePathname, useGlobalSearchParams } from "expo-router";
import '@/global.css';
import { useFonts } from "expo-font";
import { useEffect, useRef } from "react";
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '../src/config/posthog';
import { View, Text, SafeAreaView, Pressable, Linking } from 'react-native';

SplashScreen.preventAutoHideAsync();

const rawPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "";
// A valid Clerk key starts with pk_test_ or pk_live_ and contains a base64 encoded domain (at least 20 chars)
const hasValidClerkKey =
  (rawPublishableKey.startsWith("pk_test_") || rawPublishableKey.startsWith("pk_live_")) &&
  rawPublishableKey.length > 20 &&
  !rawPublishableKey.includes("placeholder");

function MissingKeyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
      <View className="w-full max-w-sm rounded-3xl bg-card p-6 border border-border shadow-lg items-center">
        <View className="w-16 h-16 rounded-2xl bg-accent/10 items-center justify-center mb-4">
          <Text className="text-3xl">🔑</Text>
        </View>

        <Text className="text-2xl font-sans-bold text-primary text-center mb-2">
          Clerk Key Required
        </Text>

        <Text className="text-sm font-sans text-muted-foreground text-center mb-6 leading-relaxed">
          Recurrly uses Clerk for authentication. To enable sign-in and protect your routes, provide your Clerk Publishable Key.
        </Text>

        <View className="w-full bg-muted/60 rounded-xl p-4 mb-6 border border-border">
          <Text className="text-xs font-sans-semibold text-primary mb-1">Add to .env:</Text>
          <Text className="text-xs font-mono text-accent">
            EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
          </Text>
        </View>

        <Pressable
          onPress={() => Linking.openURL('https://dashboard.clerk.com')}
          className="w-full bg-accent py-3.5 rounded-xl items-center active:opacity-80"
        >
          <Text className="text-white font-sans-semibold text-base">Get Key from Clerk Dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function RootLayoutContent() {
  const { isLoaded: authLoaded } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      // Filter route params to avoid leaking sensitive data
      const sanitizedParams = Object.keys(params).reduce((acc, key) => {
        // Only include specific safe params
        if (['id', 'tab', 'view'].includes(key)) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, string | string[]>);

      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...sanitizedParams,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  useEffect(() => {
    if (authLoaded) {
      SplashScreen.hideAsync();
    }
  }, [authLoaded]);

  if (!authLoaded) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'sans-regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'sans-bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'sans-medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'sans-semibold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'sans-extrabold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'sans-light': require('../assets/fonts/PlusJakartaSans-Light.ttf')
  });

  useEffect(() => {
    if (fontsLoaded && !hasValidClerkKey) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!hasValidClerkKey) {
    return <MissingKeyScreen />;
  }

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureScreens: false,
        captureTouches: true,
        propsToCapture: ['testID'],
      }}
    >
      <ClerkProvider publishableKey={rawPublishableKey} tokenCache={tokenCache}>
        <RootLayoutContent />
      </ClerkProvider>
    </PostHogProvider>
  );
}
