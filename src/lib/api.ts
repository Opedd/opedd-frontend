const EDGE_FUNCTION_BASE = 'https://djdzcciayennqchjgybx.supabase.co/functions/v1';

export const API = {
  baseUrl: EDGE_FUNCTION_BASE,
  
  // Auth endpoints
  login: EDGE_FUNCTION_BASE + '/auth-login',
  logout: EDGE_FUNCTION_BASE + '/auth-logout',
  authCheck: EDGE_FUNCTION_BASE + '/auth-check',
  
  // API proxy - append path as query param
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

// Convenience methods
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

export default api;
