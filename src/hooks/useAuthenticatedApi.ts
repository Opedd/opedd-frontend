import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { contentSourcesApi, licensesApi, api } from "@/lib/api";

/**
 * Hook that provides authenticated API methods.
 * Automatically injects the current user's access token into all API calls.
 * Handles token refresh when expired.
 */
export function useAuthenticatedApi() {
  const { getAccessToken } = useAuth();

  // Content Sources API with auto-injected token
  const contentSources = {
    listAssets: useCallback(async <T>() => {
      const token = await getAccessToken();
      return contentSourcesApi.listAssets<T>(token);
    }, [getAccessToken]),

    list: useCallback(async <T>() => {
      const token = await getAccessToken();
      return contentSourcesApi.list<T>(token);
    }, [getAccessToken]),

    create: useCallback(async <T>(body: { 
      url: string; 
      name: string; 
      platform: "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
      human_price?: number; 
      ai_price?: number 
    }) => {
      const token = await getAccessToken();
      return contentSourcesApi.create<T>(body, token);
    }, [getAccessToken]),

    verify: useCallback(async <T>(sourceId: string) => {
      const token = await getAccessToken();
      return contentSourcesApi.verify<T>(sourceId, token);
    }, [getAccessToken]),

    sync: useCallback(async <T>(sourceId: string) => {
      const token = await getAccessToken();
      return contentSourcesApi.sync<T>(sourceId, token);
    }, [getAccessToken]),
  };

  // Licenses API with auto-injected token
  const licenses = {
    list: useCallback(async <T>(params?: { page?: number; limit?: number; search?: string; status?: string; source_id?: string }) => {
      const token = await getAccessToken();
      return licensesApi.list<T>(params, token);
    }, [getAccessToken]),

    create: useCallback(async <T>(body: { 
      title: string; 
      description?: string; 
      licenseType?: string; 
      metadata?: Record<string, unknown> 
    }) => {
      const token = await getAccessToken();
      return licensesApi.create<T>(body, token);
    }, [getAccessToken]),

    delete: useCallback(async (id: string) => {
      const token = await getAccessToken();
      return licensesApi.delete(id, token);
    }, [getAccessToken]),

    updatePrices: useCallback(async <T>(body: {
      articleIds?: string[];
      sourceId?: string;
      humanPrice?: number;
      aiPrice?: number;
      licensingEnabled?: boolean;
    }) => {
      const token = await getAccessToken();
      return licensesApi.updatePrices<T>(body, token);
    }, [getAccessToken]),
  };

  // Generic API methods with auto-injected token
  const authenticatedApi = {
    get: useCallback(async <T>(path: string) => {
      const token = await getAccessToken();
      return api.get<T>(path, token);
    }, [getAccessToken]),

    post: useCallback(async <T>(path: string, body: unknown) => {
      const token = await getAccessToken();
      return api.post<T>(path, body, token);
    }, [getAccessToken]),

    put: useCallback(async <T>(path: string, body: unknown) => {
      const token = await getAccessToken();
      return api.put<T>(path, body, token);
    }, [getAccessToken]),

    delete: useCallback(async <T>(path: string) => {
      const token = await getAccessToken();
      return api.delete<T>(path, token);
    }, [getAccessToken]),
  };

  return {
    contentSources,
    licenses,
    api: authenticatedApi,
  };
}
