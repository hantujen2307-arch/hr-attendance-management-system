/**
 * Frontend Client-Side API Helper & Configuration
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://hr-attendance-management-system-production.up.railway.app/api';

export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  'https://hr-attendance-management-system-production.up.railway.app';

export { getPhotoUrl } from './utils';

/**
 * Retrieves the stored auth token from localStorage or document cookies.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const localToken =
      localStorage.getItem('access_token') ||
      localStorage.getItem('auth_token');
    if (localToken) return localToken;

    const cookieMatch = document.cookie
      .split('; ')
      .find((row) => row.startsWith('access_token=') || row.startsWith('auth_token='));
    if (cookieMatch) {
      return cookieMatch.split('=')[1] || null;
    }
  } catch {
    // ignore in environments where storage is blocked
  }
  return null;
}

/**
 * Helper to get default authenticated headers including Bearer token
 */
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Universal authenticated fetch helper for frontend client components.
 * Works with both relative Next.js API routes (/api/...) and absolute Railway backend endpoints.
 * Automatically attaches Authorization: Bearer <token> header and credentials: 'include'.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number; ok: boolean }> {
  const token = getAuthToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // If endpoint is relative, hit the same-origin Next.js BFF route
  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/')
    ? endpoint
    : `${API_BASE_URL}/${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const errorMsg = data?.message || `Request failed with status ${res.status}`;
      return { data: null, error: errorMsg, status: res.status, ok: false };
    }

    return { data, error: null, status: res.status, ok: true };
  } catch (err: any) {
    console.error(`API Fetch error for [${url}]:`, err);
    return { data: null, error: err.message || 'Network error occurred', status: 0, ok: false };
  }
}
