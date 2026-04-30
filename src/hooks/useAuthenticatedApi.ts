import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { licensesApi } from "@/lib/api";

/**
 * Hook that provides authenticated API methods.
 * Automatically injects the current user's access token into all API calls.
 * Handles token refresh when expired.
 */
export function useAuthenticatedApi() {
  const { getAccessToken } = useAuth();

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

  return {
    licenses,
  };
}
