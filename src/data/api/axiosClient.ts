import axios from 'axios';
import { attachCsrfHeader } from './csrf';

/**
 * Single Axios instance for the Novy API. Browser sessions live in HttpOnly
 * cookies, so every request must opt into credentials; the request
 * interceptor mirrors the readable CSRF cookie into the header.
 */
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => attachCsrfHeader(config));
