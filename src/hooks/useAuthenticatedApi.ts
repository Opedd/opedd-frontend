import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { contentSourcesApi, licensesApi, api, platformApi } from "@/lib/api";
import type { DetectionResult, ConnectResult, PlatformStatusResult } from "@/lib/api";

/**
 * Hook that provides authenticated API methods.
 * Automatically injects the current user's access token into all API calls.
 * Handles token refresh when expired.
 */
export function useAuthenticatedApi() {
  const { getAccessToken } = useAuth();

  // Content Sources API with auto-injected token
  const csListAssets = useCallback(async <T>() => {
    const token = await getAccessToken();
    return contentSourcesApi.listAssets<T>(token);
  }, [getAccessToken]);

  const csList = useCallback(async <T>() => {
    const token = await getAccessToken();
    return contentSourcesApi.list<T>(token);
  }, [getAccessToken]);

  const csCreate = useCallback(async <T>(body: {
    url: string;
    name: string;
    platform: "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
    human_price?: number;
    ai_price?: number
  }) => {
    const token = await getAccessToken();
    return contentSourcesApi.create<T>(body, token);
  }, [getAccessToken]);

  const csVerify = useCallback(async <T>(sourceId: string) => {
    const token = await getAccessToken();
    return contentSourcesApi.verify<T>(sourceId, token);
  }, [getAccessToken]);

  const csSync = useCallback(async <T>(sourceId: string) => {
    const token = await getAccessToken();
    return contentSourcesApi.sync<T>(sourceId, token);
  }, [getAccessToken]);

  const contentSources = useMemo(() => ({
    listAssets: csListAssets,
    list: csList,
    create: csCreate,
    verify: csVerify,
    sync: csSync,
  }), [csListAssets, csList, csCreate, csVerify, csSync]);

  // Licenses API with auto-injected token
  const licList = useCallback(async <T>(params?: { page?: number; limit?: number; search?: string; status?: string; source_id?: string }) => {
    const token = await getAccessToken();
    return licensesApi.list<T>(params, token);
  }, [getAccessToken]);

  const licCreate = useCallback(async <T>(body: {
    title: string;
    description?: string;
    licenseType?: string;
    metadata?: Record<string, unknown>
  }) => {
    const token = await getAccessToken();
    return licensesApi.create<T>(body, token);
  }, [getAccessToken]);

  const licDelete = useCallback(async (id: string) => {
    const token = await getAccessToken();
    return licensesApi.delete(id, token);
  }, [getAccessToken]);

  const licUpdatePrices = useCallback(async <T>(body: {
    articleIds?: string[];
    sourceId?: string;
    humanPrice?: number;
    aiPrice?: number;
    licensingEnabled?: boolean;
  }) => {
    const token = await getAccessToken();
    return licensesApi.updatePrices<T>(body, token);
  }, [getAccessToken]);

  const licenses = useMemo(() => ({
    list: licList,
    create: licCreate,
    delete: licDelete,
    updatePrices: licUpdatePrices,
  }), [licList, licCreate, licDelete, licUpdatePrices]);

  // Generic API methods with auto-injected token
  const apiGet = useCallback(async <T>(path: string) => {
    const token = await getAccessToken();
    return api.get<T>(path, token);
  }, [getAccessToken]);

  const apiPost = useCallback(async <T>(path: string, body: unknown) => {
    const token = await getAccessToken();
    return api.post<T>(path, body, token);
  }, [getAccessToken]);

  const apiPut = useCallback(async <T>(path: string, body: unknown) => {
    const token = await getAccessToken();
    return api.put<T>(path, body, token);
  }, [getAccessToken]);

  const apiDelete = useCallback(async <T>(path: string) => {
    const token = await getAccessToken();
    return api.delete<T>(path, token);
  }, [getAccessToken]);

  const authenticatedApi = useMemo(() => ({
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete,
  }), [apiGet, apiPost, apiPut, apiDelete]);

  // Platform API with auto-injected token
  const platDetect = useCallback(async (url: string) => {
    const token = await getAccessToken();
    return platformApi.detect(url, token);
  }, [getAccessToken]);

  const platConnect = useCallback(async (payload: {
    url?: string;
    source_id?: string;
    platform: string;
    credentials?: Record<string, string>;
  }) => {
    const token = await getAccessToken();
    return platformApi.connect(payload, token);
  }, [getAccessToken]);

  const platStatus = useCallback(async (sourceId: string) => {
    const token = await getAccessToken();
    return platformApi.status(sourceId, token);
  }, [getAccessToken]);

  const platform = useMemo(() => ({
    detect: platDetect,
    connect: platConnect,
    status: platStatus,
  }), [platDetect, platConnect, platStatus]);

  return {
    contentSources,
    licenses,
    api: authenticatedApi,
    platform,
  };
}
