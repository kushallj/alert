import PostHog from 'posthog-react-native'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const rawApiKey = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined
const rawHost = Constants.expoConfig?.extra?.posthogHost as string | undefined

// Trim and normalize API key and host
const apiKey = rawApiKey?.trim()
const host = rawHost?.trim()
const isPostHogConfigured = !!apiKey && apiKey !== '' && apiKey !== 'phc_your_project_token_here'

if (!isPostHogConfigured) {
  console.warn(
    'PostHog project token not configured. Analytics will be disabled. ' +
      'Set POSTHOG_PROJECT_TOKEN in your .env file to enable analytics.'
  )
}

// Memory fallback to prevent "window is not defined" during Expo SSR
const memoryStorage: Record<string, string> = {}

const safeStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return memoryStorage[key] ?? null
    }
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return memoryStorage[key] ?? null
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      memoryStorage[key] = value
      return
    }
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      memoryStorage[key] = value
    }
  },
}

export const posthog = new PostHog(apiKey || 'placeholder_key', {
  ...(host ? { host } : {}),
  disabled: !isPostHogConfigured,
  customStorage: safeStorage,
  captureAppLifecycleEvents: true,
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
})
