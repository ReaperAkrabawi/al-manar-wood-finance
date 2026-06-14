import type { TranslationKey } from '@/locales/en';

interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

export function getAuthErrorKey(err: unknown): TranslationKey {
  const code = (err as FirebaseErrorLike)?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'auth.emailInUse';
    case 'auth/invalid-email':
      return 'auth.invalidEmail';
    case 'auth/weak-password':
      return 'auth.weakPassword';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'auth.invalidCredentials';
    case 'auth/too-many-requests':
      return 'auth.tooManyRequests';
    case 'auth/network-request-failed':
      return 'auth.networkError';
    case 'auth/operation-not-allowed':
      return 'auth.notEnabled';
    default:
      if ((err as FirebaseErrorLike)?.message?.includes('CONFIGURATION_NOT_FOUND')) {
        return 'auth.notEnabled';
      }
      return 'auth.authFailed';
  }
}
