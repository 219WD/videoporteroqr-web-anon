import axios from 'axios';
import { getGuestToken } from './session';

const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const guestToken = getGuestToken();

  if (guestToken) {
    config.headers = config.headers || {};
    config.headers['x-guest-token'] = guestToken;
  }

  return config;
});
