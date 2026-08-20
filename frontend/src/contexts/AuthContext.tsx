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
const STORAGE_KEY_MUST_CHANGE = 'tbc_must_change';

type Storage = typeof localStorage | typeof sessionStorage;

function getStorage(remember: boolean): Storage {
  return remember ? localStorage : sessionStorage;
}

/** JWT payload의 exp(초)만 읽어 만료 여부 확인. 서명 검증 없음. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function loadFromStorage(storage: Storage): { token: string; role: UserRole; name: string; mustChangePassword: boolean } | null {
  const token = storage.getItem(STORAGE_KEY_TOKEN);
  const role = storage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
  const name = storage.getItem(STORAGE_KEY_NAME);
  const mustChangePassword = storage.getItem(STORAGE_KEY_MUST_CHANGE) === '1';
  if (!token || !role || !name) return null;
  if (isTokenExpired(token)) return null;
  return { token, role, name, mustChangePassword };
}

interface AuthContextValue {
  token: string | null;
  role: UserRole | null;
  name: string | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (loginId: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  setMustChangePassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePasswordState] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const persist = useCallback(
    (newToken: string, newRole: UserRole, newName: string, remember: boolean, newMustChangePassword = false) => {
      const storage = getStorage(remember);
      storage.setItem(STORAGE_KEY_TOKEN, newToken);
      storage.setItem(STORAGE_KEY_ROLE, newRole);
      storage.setItem(STORAGE_KEY_NAME, newName);
      if (newMustChangePassword) storage.setItem(STORAGE_KEY_MUST_CHANGE, '1');
      else storage.removeItem(STORAGE_KEY_MUST_CHANGE);
      if (remember) localStorage.setItem(STORAGE_KEY_REMEMBER, '1');
      else localStorage.removeItem(STORAGE_KEY_REMEMBER);
      setToken(newToken);
      setRole(newRole);
      setName(newName);
      setMustChangePasswordState(newMustChangePassword);
    },
    []
  );

  const setMustChangePassword = useCallback((value: boolean) => {
    setMustChangePasswordState(value);
    const remember = localStorage.getItem(STORAGE_KEY_REMEMBER) === '1';
    const storage = getStorage(remember);
    if (value) storage.setItem(STORAGE_KEY_MUST_CHANGE, '1');
    else storage.removeItem(STORAGE_KEY_MUST_CHANGE);
  }, []);

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    localStorage.removeItem(STORAGE_KEY_MUST_CHANGE);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_ROLE);
    sessionStorage.removeItem(STORAGE_KEY_NAME);
    sessionStorage.removeItem(STORAGE_KEY_MUST_CHANGE);
    sessionStorage.removeItem('tbc_student_popups_shown');
    setToken(null);
    setRole(null);
    setName(null);
    setMustChangePasswordState(false);
  }, []);

  useEffect(() => {
    const remember = localStorage.getItem(STORAGE_KEY_REMEMBER) === '1';
    const storage = getStorage(remember);
    const saved = loadFromStorage(storage);
    if (saved) {
      setToken(saved.token);
      setRole(saved.role);
      setName(saved.name);
      setMustChangePasswordState(saved.mustChangePassword);
    } else {
      // 저장된 토큰이 없거나 만료된 경우 스토리지 정리 (만료 시 로그인 화면으로)
      const token = storage.getItem(STORAGE_KEY_TOKEN);
      if (token && isTokenExpired(token)) {
        clearStorage();
      }
    }
    setIsReady(true);
  }, [clearStorage]);

  const login = useCallback(
    async (loginId: string, password: string, remember: boolean) => {
      try {
        const res = await axios.post<{
          success: boolean;
          data?: {
            token: string;
            user: { id: string; role: UserRole; name: string; mustChangePassword?: boolean };
          };
          message?: string;
        }>(
          `${apiBaseUrl}/api/auth/login`,
          { loginId, password }
        );
        if (!res.data.success || !res.data.data) {
          const msg = res.data.message ?? '아이디 또는 비밀번호가 올바르지 않습니다.';
          throw new Error(msg);
        }
        const { token: newToken, user } = res.data.data;
        sessionStorage.removeItem('tbc_student_popups_shown');
        persist(newToken, user.role, user.name, remember, user.mustChangePassword === true);
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
      mustChangePassword,
      isAuthenticated: !!token && !!role,
      isReady,
      login,
      logout,
      setMustChangePassword,
    }),
    [token, role, name, mustChangePassword, isReady, login, logout, setMustChangePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
