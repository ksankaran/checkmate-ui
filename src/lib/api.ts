// Runtime config injected via __ENV.js (see docker-entrypoint.sh)
// Falls back to localhost for local development
declare global {
  interface Window {
    __ENV?: {
      API_URL?: string;
    };
  }
}

export const API_URL = (typeof window !== 'undefined' && window.__ENV?.API_URL) || 'http://localhost:8000';
