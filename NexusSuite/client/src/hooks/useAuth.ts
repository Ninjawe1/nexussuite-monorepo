import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const user: User | undefined = (data && (data.user || data)) as User | undefined;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: async () => {
      try {
        await apiRequest("/api/auth/logout", "POST", {});
      } catch (e) {
        // Even if the API fails, proceed to clear client state
        console.warn(
          "Logout API call failed, proceeding to clear client state",
          e,
        );
      } finally {
        try {
          // Clear react-query cache to remove user data immediately
          queryClient.clear();
        } catch (_) {}
        // Navigate to landing/login page
        window.location.assign("/");
      }
    },
  };
}
