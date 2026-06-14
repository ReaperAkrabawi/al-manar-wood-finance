import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ENABLED_KEY = 'almanar_bio_enabled';
const EMAIL_KEY = 'almanar_bio_email';
const PASSWORD_KEY = 'almanar_bio_password';
const LEGACY_PIN_KEY = 'almanar_pin';
const PIN_MIGRATED_KEY = 'almanar_pin_migrated';

export type BiometricLabel = 'faceId' | 'fingerprint' | 'deviceUnlock';

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function getBiometricLabelType(): Promise<BiometricLabel> {
  if (Platform.OS === 'web') return 'deviceUnlock';
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'faceId';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  return 'deviceUnlock';
}

export async function authenticate(reason: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Use passcode',
  });
  return result.success;
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const flag = await AsyncStorage.getItem(ENABLED_KEY);
  return flag === 'true';
}

export async function hasStoredCredentials(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  return Boolean(email && password);
}

export async function enableBiometricLogin(email: string, password: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(EMAIL_KEY, email.trim());
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
  await AsyncStorage.setItem(ENABLED_KEY, 'true');
}

export async function disableBiometricLogin(): Promise<void> {
  if (Platform.OS === 'web') return;
  await AsyncStorage.removeItem(ENABLED_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
}

export async function setBiometricEnabledFlag(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  if (enabled) {
    await AsyncStorage.setItem(ENABLED_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(ENABLED_KEY);
  }
}

export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  if (Platform.OS === 'web') return null;
  const email = await SecureStore.getItemAsync(EMAIL_KEY);
  const password = await SecureStore.getItemAsync(PASSWORD_KEY);
  if (!email || !password) return null;
  return { email, password };
}

/** Clear legacy app PIN and return true if a PIN was removed (first time only). */
export async function migrateLegacyPin(): Promise<boolean> {
  if (await AsyncStorage.getItem(PIN_MIGRATED_KEY)) return false;

  let hadPin = false;
  const legacyPin = await AsyncStorage.getItem(LEGACY_PIN_KEY);
  if (legacyPin) {
    await AsyncStorage.removeItem(LEGACY_PIN_KEY);
    hadPin = true;
  }

  const legacySettings = await AsyncStorage.getItem('almanar_settings');
  if (legacySettings) {
    try {
      const parsed = JSON.parse(legacySettings) as { pin?: string };
      if (parsed.pin) {
        delete parsed.pin;
        await AsyncStorage.setItem('almanar_settings', JSON.stringify(parsed));
        hadPin = true;
      }
    } catch {
      // ignore malformed legacy settings
    }
  }

  await AsyncStorage.setItem(PIN_MIGRATED_KEY, 'true');
  return hadPin;
}

export async function wasPinMigrated(): Promise<boolean> {
  return (await AsyncStorage.getItem(PIN_MIGRATED_KEY)) === 'true';
}
