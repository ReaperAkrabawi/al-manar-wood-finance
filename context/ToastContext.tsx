import React, { createContext, useCallback, useContext, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  }, []);

  const bottomOffset = Platform.OS === 'web' ? insets.bottom + 94 : insets.bottom + 88;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="none">
        {toasts.map(toast => (
          <View
            key={toast.id}
            style={[
              styles.toast,
              toast.type === 'error' ? styles.errorToast
                : toast.type === 'info' ? styles.infoToast
                : styles.successToast,
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 99999,
    gap: 8,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  successToast: { backgroundColor: '#22C55E' },
  errorToast: { backgroundColor: '#EF4444' },
  infoToast: { backgroundColor: '#3B82F6' },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
});
