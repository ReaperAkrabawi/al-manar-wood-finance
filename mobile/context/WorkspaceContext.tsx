import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types';
import { genId, genInviteCode } from '@/utils/id';

interface WorkspaceContextValue {
  workspaceId: string | null;
  workspace: Workspace | null;
  role: WorkspaceRole | null;
  memberCount: number;
  members: WorkspaceMember[];
  loading: boolean;
  createWorkspace: (name: string) => Promise<string>;
  joinWorkspace: (inviteCode: string) => Promise<void>;
  createInvite: () => Promise<string>;
  refreshWorkspace: () => Promise<void>;
  ensureInviteCode: () => Promise<string | null>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function findWorkspaceByInviteCode(code: string): Promise<string | null> {
  const db = getFirebaseDb();
  const q = query(collection(db, 'workspaces'), where('inviteCode', '==', code));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0]!.id;

  const legacy = await getDoc(doc(db, 'invites', code));
  if (legacy.exists() && !legacy.data()?.used) {
    return legacy.data()?.workspaceId as string;
  }
  if (legacy.exists() && legacy.data()?.used) {
    const wsId = legacy.data()?.workspaceId as string;
    const wsSnap = await getDoc(doc(db, 'workspaces', wsId));
    if (wsSnap.exists() && wsSnap.data()?.inviteCode === code) return wsId;
  }
  return null;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  const loadActiveWorkspace = useCallback(async (uid: string) => {
    const db = getFirebaseDb();
    const userSnap = await getDoc(doc(db, 'users', uid));
    const activeId = userSnap.data()?.activeWorkspaceId as string | undefined;
    if (!activeId) {
      setWorkspaceId(null);
      setWorkspace(null);
      setRole(null);
      setMemberCount(0);
      setMembers([]);
      setLoading(false);
      return;
    }

    const memberSnap = await getDoc(doc(db, 'workspaces', activeId, 'members', uid));
    if (!memberSnap.exists()) {
      setWorkspaceId(null);
      setWorkspace(null);
      setRole(null);
      setMemberCount(0);
      setMembers([]);
      setLoading(false);
      return;
    }

    setWorkspaceId(activeId);
    setRole(memberSnap.data().role as WorkspaceRole);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    if (!user) {
      setWorkspaceId(null);
      setWorkspace(null);
      setRole(null);
      setMemberCount(0);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadActiveWorkspace(user.uid);
  }, [user, loadActiveWorkspace]);

  useEffect(() => {
    if (!workspaceId) {
      setWorkspace(null);
      setMembers([]);
      return;
    }

    const db = getFirebaseDb();
    const unsubWorkspace = onSnapshot(doc(db, 'workspaces', workspaceId), async snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      let inviteCode = data.inviteCode as string | undefined;
      if (!inviteCode && user) {
        inviteCode = genInviteCode();
        await updateDoc(doc(db, 'workspaces', workspaceId), { inviteCode });
        await setDoc(doc(db, 'invites', inviteCode), {
          workspaceId,
          permanent: true,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
      setWorkspace({
        id: snap.id,
        name: data.name ?? 'Workspace',
        ownerId: data.ownerId ?? '',
        createdAt: data.createdAt ?? '',
        settings: data.settings ?? {},
        inviteCode,
      });
    });

    const unsubMembers = onSnapshot(collection(db, 'workspaces', workspaceId, 'members'), snap => {
      setMemberCount(snap.size);
      const list: WorkspaceMember[] = snap.docs.map(d => ({
        uid: d.id,
        role: d.data().role as WorkspaceRole,
        joinedAt: d.data().joinedAt ?? '',
        email: d.data().email,
      }));
      list.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
      setMembers(list);
    });

    return () => {
      unsubWorkspace();
      unsubMembers();
    };
  }, [workspaceId, user]);

  useEffect(() => {
    if (!user || !workspaceId) return;
    import('@/services/syncMigration').then(m => {
      m.runSyncMigration(user.uid, workspaceId, user).catch(() => {});
    });
  }, [user, workspaceId]);

  async function createWorkspace(name: string): Promise<string> {
    if (!user) throw new Error('Not authenticated');
    const db = getFirebaseDb();
    const id = genId();
    const now = new Date().toISOString();
    const inviteCode = genInviteCode();

    const batch = writeBatch(db);
    batch.set(doc(db, 'workspaces', id), {
      name: name.trim() || 'My Workshop',
      ownerId: user.uid,
      createdAt: now,
      settings: {},
      inviteCode,
    });
    batch.set(doc(db, 'workspaces', id, 'members', user.uid), {
      role: 'owner',
      joinedAt: now,
      email: user.email ?? undefined,
    });
    batch.set(doc(db, 'invites', inviteCode), {
      workspaceId: id,
      permanent: true,
      createdBy: user.uid,
      createdAt: now,
    });
    batch.set(doc(db, 'users', user.uid), {
      activeWorkspaceId: id,
      email: user.email,
    }, { merge: true });
    await batch.commit();

    setWorkspaceId(id);
    setRole('owner');
    setLoading(false);
    return id;
  }

  async function joinWorkspace(inviteCode: string): Promise<void> {
    if (!user) throw new Error('Not authenticated');
    const code = inviteCode.trim().toUpperCase();
    const db = getFirebaseDb();
    const wsId = await findWorkspaceByInviteCode(code);
    if (!wsId) throw new Error('Invalid invite code');

    const existing = await getDoc(doc(db, 'workspaces', wsId, 'members', user.uid));
    if (existing.exists()) throw new Error('Already a member');

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    batch.set(doc(db, 'workspaces', wsId, 'members', user.uid), {
      role: 'member',
      joinedAt: now,
      email: user.email ?? undefined,
    });
    batch.set(doc(db, 'users', user.uid), {
      activeWorkspaceId: wsId,
      email: user.email,
    }, { merge: true });
    await batch.commit();

    setWorkspaceId(wsId);
    setRole('member');
    setLoading(false);
  }

  async function ensureInviteCode(): Promise<string | null> {
    if (workspace?.inviteCode) return workspace.inviteCode;
    if (!workspaceId || role !== 'owner') return null;
    return createInvite();
  }

  async function createInvite(): Promise<string> {
    if (!user || !workspaceId) throw new Error('No workspace');
    if (role !== 'owner') throw new Error('Only workspace owner can create invites');

    if (workspace?.inviteCode) return workspace.inviteCode;

    const db = getFirebaseDb();
    let code = genInviteCode();
    for (let i = 0; i < 5; i++) {
      const existing = await getDoc(doc(db, 'invites', code));
      if (!existing.exists()) break;
      code = genInviteCode();
    }

    await updateDoc(doc(db, 'workspaces', workspaceId), { inviteCode: code });
    await setDoc(doc(db, 'invites', code), {
      workspaceId,
      permanent: true,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    });

    return code;
  }

  async function refreshWorkspace() {
    if (user) {
      setLoading(true);
      await loadActiveWorkspace(user.uid);
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceId,
        workspace,
        role,
        memberCount,
        members,
        loading,
        createWorkspace,
        joinWorkspace,
        createInvite,
        refreshWorkspace,
        ensureInviteCode,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
