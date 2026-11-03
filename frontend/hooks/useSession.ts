import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

export function useSession() {
  const query = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<SessionUser>("/api/auth/me");
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
  return {
    user: query.data ?? null,
    loading: query.isPending || query.isFetching,
    error: query.error,
    refresh: query.refetch,
  };
}
