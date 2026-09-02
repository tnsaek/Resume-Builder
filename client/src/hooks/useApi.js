import { useCallback } from 'react';

export const createApiRequest = (token) => async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

export function useApi(token) {
  return {
    apiRequest: useCallback(createApiRequest(token), [token])
  };
}
