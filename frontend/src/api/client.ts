import axios from 'axios';
import { apiBaseUrl } from '../config';

const STORAGE_KEY_TOKEN = 'tbc_token';
const STORAGE_KEY_ROLE = 'tbc_role';
const STORAGE_KEY_NAME = 'tbc_name';
const STORAGE_KEY_REMEMBER = 'tbc_remember';

const STORAGE_KEY_PREVIEW_BACKUP = 'tbc_preview_backup';

const getToken = () => {
  // 미리보기 중에는 sessionStorage 토큰(학생/학부모)을 우선 사용
  if (sessionStorage.getItem(STORAGE_KEY_PREVIEW_BACKUP)) {
    return sessionStorage.getItem(STORAGE_KEY_TOKEN);
  }
  return localStorage.getItem(STORAGE_KEY_TOKEN) ?? sessionStorage.getItem(STORAGE_KEY_TOKEN);
};

/** 401 시 인증 정보 제거 후 로그인 페이지로 이동 (토큰 만료 등) */
function clearAuthAndRedirectToLogin(): void {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_ROLE);
  localStorage.removeItem(STORAGE_KEY_NAME);
  localStorage.removeItem(STORAGE_KEY_REMEMBER);
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_ROLE);
  sessionStorage.removeItem(STORAGE_KEY_NAME);
  sessionStorage.removeItem(STORAGE_KEY_PREVIEW_BACKUP);
  window.location.href = '/login';
}

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      clearAuthAndRedirectToLogin();
    }
    return Promise.reject(err);
  }
);
