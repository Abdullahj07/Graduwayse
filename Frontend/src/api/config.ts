declare global {
  interface Window {
    __GRADUWAYSE_CONFIG__?: {
      API_BASE_URL?: string;
      WS_BASE_URL?: string;
    };
  }
}

export const API_BASE_URL = (
  window.__GRADUWAYSE_CONFIG__?.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

export const WS_BASE_URL = (
  window.__GRADUWAYSE_CONFIG__?.WS_BASE_URL ||
  import.meta.env.VITE_WS_BASE_URL ||
  "ws://127.0.0.1:8000"
).replace(/\/$/, "");