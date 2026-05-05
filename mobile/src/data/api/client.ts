import axios from 'axios';
import { tokenStorage } from '../storage/tokenStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://docepreco.onrender.com/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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
    const rawMessage = error.response?.data?.error || error.message || 'Unknown error';
    const message = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('Network Error'))
      ? 'Sem conexão com o servidor. Tente novamente em alguns segundos.'
      : rawMessage;
    console.error(`[API] ✗ ${status} ${method} ${url} — ${message}`);
    const apiError: Error & {
      status?: number;
      code?: string;
      limit?: number;
      current?: number;
    } = new Error(message);
    if (typeof status === 'number') apiError.status = status;
    const data = error.response?.data;
    if (data?.code) apiError.code = data.code;
    if (typeof data?.limit === 'number') apiError.limit = data.limit;
    if (typeof data?.current === 'number') apiError.current = data.current;
    return Promise.reject(apiError);
  }
);
