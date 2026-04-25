const EDGE_FUNCTION_BASE = 'https://api.opedd.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqZHpjY2lheWVubnFjaGpneWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MTEyODIsImV4cCI6MjA4NDQ4NzI4Mn0.yy8AU2uOMMjqyGsjWLNlzsUp93Z9UQ7N-PRe90qDG3E';

export const API = {
  baseUrl: EDGE_FUNCTION_BASE,

  // Direct Edge Function endpoints
  licenses: EDGE_FUNCTION_BASE + '/licenses',
};

// Safely parse JSON response, handling empty bodies
async function safeParseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  
  if (!text || !text.trim()) {
    return { success: true, data: [] };
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}

// Direct Edge Function fetch (bypasses proxy)
export async function edgeFetch<T>(
  url: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await safeParseJson(response) as { success?: boolean; data?: T; error?: { message: string } };

  if (!data.success) {
    throw new Error(data.error?.message || 'API request failed');
  }

  return data.data as T;
}

// Direct Edge Function fetch returning full envelope (for paginated responses)
export async function edgeFetchPaginated<T>(
  url: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (accessToken) {
    headers['Authorization'] = 'Bearer ' + accessToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const result = await safeParseJson(response) as { success?: boolean; data?: unknown; total?: number; page?: number; limit?: number; protectedCount?: number; error?: { message: string } };

  if (!result.success) {
    throw new Error(result.error?.message || 'API request failed');
  }

  // Return the full envelope (data + total + page + limit + protectedCount)
  return { data: result.data, total: result.total, page: result.page, limit: result.limit, protectedCount: result.protectedCount } as T;
}

// Licenses API (direct Edge Function)
export const licensesApi = {
  list: <T>(params?: { page?: number; limit?: number; search?: string; status?: string; source_id?: string }, token?: string | null) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    if (params?.source_id && params.source_id !== "all") qs.set("source_id", params.source_id);
    const url = API.licenses + (qs.toString() ? "?" + qs.toString() : "");
    return edgeFetchPaginated<T>(url, { method: 'GET' }, token);
  },

  create: <T>(body: { title: string; description?: string; licenseType?: string; metadata?: Record<string, unknown> }, token?: string | null) =>
    edgeFetch<T>(API.licenses, { method: 'POST', body: JSON.stringify(body) }, token),

  delete: (id: string, token?: string | null) =>
    edgeFetch<{ message: string }>(API.licenses + '?id=' + encodeURIComponent(id), { method: 'DELETE' }, token),

  updatePrices: <T>(body: {
    articleIds?: string[];
    sourceId?: string;
    humanPrice?: number;
    aiPrice?: number;
    licensingEnabled?: boolean;
  }, token?: string | null) =>
    edgeFetch<T>(EDGE_FUNCTION_BASE + '/update-license-prices', {
      method: 'POST',
      body: JSON.stringify(body),
    }, token),
};

// Platform Connect API (direct Edge Function)
export interface DetectionResult {
  platform: "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
  confidence: "high" | "medium" | "low";
  name: string;
  feeds?: { url: string; type: string }[];
  article_count?: number;
}

export interface ConnectResult {
  source_id: string;
  job_id?: string;
  inbound_email?: string;
  status: string;
}

export interface ArchiveJob {
  id: string;
  status: "pending" | "running" | "complete" | "failed";
  processed_count: number;
  total_count: number;
  error?: string;
}

export interface SourceStatus {
  id: string;
  name: string;
  platform: string;
  sync_status: string;
  sync_method: string;
  article_count: number;
}

export interface PlatformStatusResult {
  job: ArchiveJob | null;
  source: SourceStatus;
  inbound_email: string;
}

export const platformApi = {
  detect: (url: string, token?: string | null) =>
    edgeFetch<DetectionResult>(
      `${EDGE_FUNCTION_BASE}/detect-platform?url=${encodeURIComponent(url)}`,
      { method: "GET" },
      token
    ),

  connect: (payload: {
    url?: string;
    source_id?: string;
    platform: string;
    credentials?: Record<string, string>;
  }, token?: string | null) =>
    edgeFetch<ConnectResult>(
      `${EDGE_FUNCTION_BASE}/platform-connect`,
      { method: "POST", body: JSON.stringify(payload) },
      token
    ),

  status: (sourceId: string, token?: string | null) =>
    edgeFetch<PlatformStatusResult>(
      `${EDGE_FUNCTION_BASE}/platform-connect?source_id=${encodeURIComponent(sourceId)}`,
      { method: "GET" },
      token
    ),
};
