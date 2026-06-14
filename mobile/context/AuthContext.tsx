import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);
      setInitializing(false);
    });
    return unsub;
  }, []);

  async function ensureUserDoc(uid: string, email: string, displayName?: string) {
    const db = getFirebaseDb();
    await setDoc(
      doc(db, 'users', uid),
      {
        email,
        displayName: displayName ?? email.split('@')[0],
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async function signIn(email: string, password: string) {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signUp(email: string, password: string, displayName?: string) {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      await ensureUserDoc(cred.user.uid, email.trim(), displayName);
    } catch {
      // Auth succeeded; user doc can be created later
    }
  }

  async function signOut() {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        isConfigured: isFirebaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
