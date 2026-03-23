import axios from 'axios';
import { tokenStorage } from '../storage/tokenStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.211.231.227:3000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async config => {
  const token = await tokenStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const method = config.method?.toUpperCase();
  const url = `${config.baseURL}${config.url}`;
  console.log(`[API] → ${method} ${url}`, config.data ? config.data : '');
  return config;
});

apiClient.interceptors.response.use(
  response => {
    const method = response.config.method?.toUpperCase();
    const url = response.config.url;
    console.log(`[API] ← ${response.status} ${method} ${url}`, response.data);
    return response;
  },
  error => {
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;
    const status = error.response?.status ?? 'ERR';
    const message = error.response?.data?.error || error.message || 'Unknown error';
    console.error(`[API] ✗ ${status} ${method} ${url} — ${message}`);
    return Promise.reject(new Error(message));
  }
);
