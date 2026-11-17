import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const backendBaseUrl = apiBaseUrl?.replace(/\/api\/v1\/?$/, '');

/**
 * Public generated-app runtime client. Builder cookies are path-scoped to
 * `/api/v1`; auth and vision calls opt into the separate runtime cookies per
 * request while public actions continue to omit credentials.
 */
export const runtimeAxiosClient = axios.create({
  baseURL: backendBaseUrl,
  timeout: 120_000,
  withCredentials: false,
});
