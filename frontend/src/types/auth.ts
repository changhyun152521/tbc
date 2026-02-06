export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface User {
  id: string;
  role: UserRole;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthState {
  token: string | null;
  role: UserRole | null;
  name: string | null;
  isReady: boolean;
}
