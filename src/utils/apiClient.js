import axios from 'axios';
import { clearAuth, isTokenValid } from './auth';

let interceptorRegistered = false;

export const setupAxiosAuthInterceptor = () => {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');

      if (error.response?.status === 401 && !isLoginRequest) {
        const message = error.response?.data?.message || 'Session expired. Please login again.';
        sessionStorage.setItem('auth_redirect_message', message);
        clearAuth();
      }
      return Promise.reject(error);
    }
  );
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token || !isTokenValid(token)) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};
