import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';

import { useWorkspace } from '@/context/WorkspaceContext';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import type { EntryTemplate, TemplatePayload, TemplateType } from '@/types';
import { genId } from '@/utils/id';
import { toFirestoreDoc } from '@/utils/firestore';

const CACHE_KEY = 'almanar_templates';

interface TemplatesContextValue {
  templates: EntryTemplate[];
  loading: boolean;
  addTemplate: (item: Omit<EntryTemplate, 'id'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

export function TemplatesProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId } = useWorkspace();
  const [templates, setTemplates] = useState<EntryTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !workspaceId) {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw) setTemplates(JSON.parse(raw));
        } catch {}
        setLoading(false);
      })();
      return;
    }

    setLoading(true);
    const db = getFirebaseDb();
    const unsub = onSnapshot(collection(db, 'workspaces', workspaceId, 'templates'), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as EntryTemplate));
      setTemplates(items.sort((a, b) => a.label.localeCompare(b.label)));
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items)).catch(() => {});
      setLoading(false);
    });
    return unsub;
  }, [workspaceId]);

  const addTemplate = useCallback(async (item: Omit<EntryTemplate, 'id'>) => {
    const id = genId();
    const template: EntryTemplate = { ...item, id };
    if (isFirebaseConfigured && workspaceId) {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, 'workspaces', workspaceId, 'templates', id),
        toFirestoreDoc({ ...template } as Record<string, unknown>),
      );
    } else {
      const next = [...templates, template];
      setTemplates(next);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
    }
  }, [templates, workspaceId]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (isFirebaseConfigured && workspaceId) {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, 'workspaces', workspaceId, 'templates', id));
    } else {
      const next = templates.filter(t => t.id !== id);
      setTemplates(next);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
    }
  }, [templates, workspaceId]);

  return (
    <TemplatesContext.Provider value={{ templates, loading, addTemplate, deleteTemplate }}>
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const ctx = useContext(TemplatesContext);
  if (!ctx) throw new Error('useTemplates must be used within TemplatesProvider');
  return ctx;
}

export type { TemplateType, TemplatePayload };
