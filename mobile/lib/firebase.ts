import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

import { initAuth } from './firebaseAuth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env');
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = initAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    try {
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      });
    } catch {
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}
