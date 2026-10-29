import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AuthResult, UserSummary } from '@shared/api';

import { api, setApiToken, setUnauthorizedHandler } from './api';
import { secure } from './storage';

const KEY = 'jejak.auth';

interface AuthState {
  user: UserSummary | null;
  ready: boolean;
  signIn: (r: AuthResult) => Promise<void>;
  signOut: () => Promise<void>;
  /** Perbarui data pengguna yang tersimpan (mis. setelah ganti nama), tanpa mengganti token. */
  updateUser: (patch: Partial<UserSummary>) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(async () => {
    setApiToken(null);
    setUser(null);
    queryClient.clear();
    await secure.remove(KEY);
  }, [queryClient]);

  useEffect(() => {
    secure
      .get(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as AuthResult;
        setApiToken(saved.token);
        setUser(saved.user);
      })
      .catch(() => {})
      .finally(() => setReady(true));
    setUnauthorizedHandler(() => void clear());
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const signIn = useCallback(async (r: AuthResult) => {
    setApiToken(r.token);
    setUser(r.user);
    await secure.set(KEY, JSON.stringify(r));
  }, []);

  const signOut = useCallback(async () => {
    await api('/logout', { method: 'POST' }).catch(() => {});
    await clear();
  }, [clear]);

  const updateUser = useCallback(async (patch: Partial<UserSummary>) => {
    const raw = await secure.get(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as AuthResult;
    const next = { ...saved, user: { ...saved.user, ...patch } };
    setUser(next.user);
    await secure.set(KEY, JSON.stringify(next));
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut, updateUser }), [user, ready, signIn, signOut, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth di luar AuthProvider');
  return ctx;
}

const NOBODY: UserSummary = { id: 0, username: '', name: '' };

/** Pengguna yang sedang masuk. Layar di balik guard selalu punya user; NOBODY hanya sesaat ketika keluar. */
export function useMe(): UserSummary {
  return useAuth().user ?? NOBODY;
}
