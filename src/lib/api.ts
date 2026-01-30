const EDGE_FUNCTION_BASE = 'https://djdzcciayennqchjgybx.supabase.co/functions/v1';

export const API = {
  baseUrl: EDGE_FUNCTION_BASE,

  // Auth endpoints
  login: EDGE_FUNCTION_BASE + '/auth-login',
  logout: EDGE_FUNCTION_BASE + '/auth-logout',
  authCheck: EDGE_FUNCTION_BASE + '/auth-check',

  // Direct Edge Function endpoints
  licenses: EDGE_FUNCTION_BASE + '/licenses',

  // Content Sources (new schema) - for fetching user's licensed assets
  // These paths are passed to the api-proxy edge function
  contentSourcesAssets: '/content-sources/me/assets',
  contentSources: '/content-sources',

  // API proxy - append path as query param (path should NOT include /api/v1 prefix)
  proxy: (path: string) => EDGE_FUNCTION_BASE + '/api-proxy?path=' + encodeURIComponent(path),
};

// Safely parse JSON response, handling empty bodies
async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  
  if (!text || !text.trim()) {
    console.warn('[API] Empty response received from:', response.url);
    return { success: true, data: [] };
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('[API] Failed to parse JSON response:', text.substring(0, 200));
    throw new Error('Invalid JSON response from server');
  }
}

// Generic fetch wrapper with auth
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const url = API.proxy(path);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }
  
  console.log('[API] Fetching: ' + path);
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  console.log('[API] Response status:', response.status);
  
  const data = await safeParseJson(response) as { success?: boolean; data?: T; error?: { message: string } };
  console.log('[API] Response for ' + path + ':', data);
  
  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }
  
  return data.data as T;
}

// Direct Edge Function fetch (bypasses proxy)
export async function edgeFetch<T>(
  url: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }

  console.log('[API] Edge fetch:', url);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log('[API] Edge response status:', response.status);

  const data = await safeParseJson(response) as { success?: boolean; data?: T; error?: { message: string } };

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}

// Convenience methods (via proxy)
export const api = {
  get: <T>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: 'GET' }, token),

  post: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),

  put: <T>(path: string, body: unknown, token?: string | null) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token),

  delete: <T>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: 'DELETE' }, token),
};

// Licenses API (direct Edge Function)
export const licensesApi = {
  list: <T>(token?: string | null) =>
    edgeFetch<T>(API.licenses, { method: 'GET' }, token),

  create: <T>(body: { title: string; description?: string; licenseType?: string; metadata?: Record<string, unknown> }, token?: string | null) =>
    edgeFetch<T>(API.licenses, { method: 'POST', body: JSON.stringify(body) }, token),

  delete: (id: string, token?: string | null) =>
    edgeFetch<{ message: string }>(API.licenses + '?id=' + encodeURIComponent(id), { method: 'DELETE' }, token),
};

// Content Sources API (new schema via proxy)
export const contentSourcesApi = {
  // Get all licensed assets for the current user
  listAssets: <T>(token?: string | null) =>
    apiFetch<T>(API.contentSourcesAssets, { method: 'GET' }, token),

  // Get content sources
  list: <T>(token?: string | null) =>
    apiFetch<T>(API.contentSources, { method: 'GET' }, token),

  // Create a new content source
  create: <T>(body: { feed_url: string; name: string; human_price?: number; ai_price?: number }, token?: string | null) =>
    apiFetch<T>(API.contentSources, { method: 'POST', body: JSON.stringify(body) }, token),

  // Verify ownership of a content source
  verify: <T>(sourceId: string, token?: string | null) =>
    apiFetch<T>(`${API.contentSources}/${sourceId}/verify`, { method: 'POST' }, token),

  // Trigger RSS sync for a content source (import articles)
  sync: <T>(sourceId: string, token?: string | null) =>
    apiFetch<T>(`${API.contentSources}/${sourceId}/sync`, { method: 'POST' }, token),
};

export default api;
