import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { AuthUser, LoginResponse } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, rut: string, pin: string) => Promise<void>;
  logout: () => void;
  activeWorkGroupId: string | null;
  setActiveWorkGroupId: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

// Si el lugar guardado ya no es válido para este usuario (cambió de
// asignación, o no hay nada guardado todavía), cae al primero de su lista.
function resolveActiveWorkGroup(user: AuthUser | null): string | null {
  if (!user || user.workGroups.length === 0) return null;
  const stored = localStorage.getItem('active_work_group_id');
  if (stored && user.workGroups.some((wg) => wg.id === stored)) return stored;
  return user.workGroups[0].id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser());
  const [activeWorkGroupId, setActiveWorkGroupIdState] = useState<string | null>(() =>
    resolveActiveWorkGroup(readStoredUser()),
  );

  async function login(email: string, rut: string, pin: string) {
    const data = await api.post<LoginResponse>('/auth/login', { email, rut, pin });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    const resolved = resolveActiveWorkGroup(data.user);
    setActiveWorkGroupIdState(resolved);
    if (resolved) localStorage.setItem('active_work_group_id', resolved);
  }

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('active_work_group_id');
    setUser(null);
    setActiveWorkGroupIdState(null);
  }

  function setActiveWorkGroupId(id: string) {
    localStorage.setItem('active_work_group_id', id);
    setActiveWorkGroupIdState(id);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, activeWorkGroupId, setActiveWorkGroupId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
