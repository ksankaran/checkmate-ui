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

// Feature flags from backend
export interface Features {
  intelligent_retry: boolean;
}

let featuresCache: Features | null = null;

export async function getFeatures(): Promise<Features> {
  if (featuresCache) {
    return featuresCache;
  }
  try {
    const res = await fetch(`${API_URL}/api/features`);
    if (res.ok) {
      featuresCache = await res.json();
      return featuresCache!;
    }
  } catch (error) {
    console.error("Failed to fetch features:", error);
  }
  // Default to disabled if fetch fails
  return { intelligent_retry: false };
}
