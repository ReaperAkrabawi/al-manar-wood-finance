import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';

// getReactNativePersistence is only in the RN Firebase Auth build; resolved at runtime on native.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('@firebase/auth/dist/rn/index.js') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => import('firebase/auth').Persistence;
};

export function initAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}
