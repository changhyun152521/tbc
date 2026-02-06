import axios from 'axios';
import { apiBaseUrl } from '../config';

const STORAGE_KEY_TOKEN = 'tbc_token';
const getToken = () => localStorage.getItem(STORAGE_KEY_TOKEN) ?? sessionStorage.getItem(STORAGE_KEY_TOKEN);

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
