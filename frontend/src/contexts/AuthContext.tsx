import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';
import { apiBaseUrl } from '../config';
import type { UserRole } from '../types/auth';

const STORAGE_KEY_TOKEN = 'tbc_token';
const STORAGE_KEY_ROLE = 'tbc_role';
const STORAGE_KEY_NAME = 'tbc_name';
const STORAGE_KEY_REMEMBER = 'tbc_remember';

type Storage = typeof localStorage | typeof sessionStorage;

function getStorage(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage;
}

function loadFromStorage(storage: Storage): { token: string; role: UserRole; name: string } | null {
  const token = storage.getItem(STORAGE_KEY_TOKEN);
  const role = storage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
  const name = storage.getItem(STORAGE_KEY_NAME);
  if (token && role && name) return { token, role, name };
  return null;
}

interface AuthContextValue {
  token: string | null;
  role: UserRole | null;
  name: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (loginId: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const persist = useCallback((newToken: string, newRole: UserRole, newName: string, remember: boolean) => {
    const storage = getStorage(remember);
    storage.setItem(STORAGE_KEY_TOKEN, newToken);
    storage.setItem(STORAGE_KEY_ROLE, newRole);
    storage.setItem(STORAGE_KEY_NAME, newName);
    if (remember) localStorage.setItem(STORAGE_KEY_REMEMBER, '1');
    else localStorage.removeItem(STORAGE_KEY_REMEMBER);
    setToken(newToken);
    setRole(newRole);
    setName(newName);
  }, []);

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_ROLE);
    sessionStorage.removeItem(STORAGE_KEY_NAME);
    setToken(null);
    setRole(null);
    setName(null);
  }, []);

  useEffect(() => {
    const remember = localStorage.getItem(STORAGE_KEY_REMEMBER) === '1';
    const storage = getStorage(remember);
    const saved = loadFromStorage(storage);
    if (saved) {
      setToken(saved.token);
      setRole(saved.role);
      setName(saved.name);
    }
    setIsReady(true);
  }, []);

  const login = useCallback(
    async (loginId: string, password: string, remember: boolean) => {
      try {
        const res = await axios.post<{ success: boolean; data?: { token: string; user: { id: string; role: UserRole; name: string } }; message?: string }>(
          `${apiBaseUrl}/api/auth/login`,
          { loginId, password }
        );
        if (!res.data.success || !res.data.data) {
          const msg = res.data.message ?? '아이디 또는 비밀번호가 올바르지 않습니다.';
          throw new Error(msg);
        }
        const { token: newToken, user } = res.data.data;
        persist(newToken, user.role, user.name, remember);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          throw new Error(err.response.data.message as string);
        }
        throw err;
      }
    },
    [persist]
  );

  const logout = useCallback(() => {
    clearStorage();
  }, [clearStorage]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role,
      name,
      isAuthenticated: !!token && !!role,
      isReady,
      login,
      logout,
    }),
    [token, role, name, isReady, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
