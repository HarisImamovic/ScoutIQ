import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const REFRESH_TOKEN_KEY = "scoutiq_rt";

let _accessToken: string | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens() {
  setAccessToken(null);
  setStoredRefreshToken(null);
}

const client = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    const storedRefresh = getStoredRefreshToken();
    if (!storedRefresh) {
      clearTokens();
      window.location.replace("/login");
      return Promise.reject(error);
    }

    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _refreshQueue.push((newToken) => {
          if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(client(original));
          } else {
            reject(error);
          }
        });
      });
    }

    _isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${API_BASE}/api/v1/auth/refresh`,
        { refresh_token: storedRefresh },
        { timeout: 10000 }
      );

      setAccessToken(data.access_token);
      setStoredRefreshToken(data.refresh_token);

      _refreshQueue.forEach((cb) => cb(data.access_token));
      _refreshQueue = [];

      original.headers.Authorization = `Bearer ${data.access_token}`;
      return client(original);
    } catch {
      clearTokens();
      _refreshQueue.forEach((cb) => cb(null));
      _refreshQueue = [];
      window.location.replace("/login");
      return Promise.reject(error);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default client;
