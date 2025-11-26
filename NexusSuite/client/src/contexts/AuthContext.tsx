/**
 * Enhanced Authentication Context with Better Auth Integration
 * Provides global authentication state and user management
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { betterAuthService, User, Session } from "@/services/betterAuthService";
import { useToast } from "@/hooks/use-toast";


interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    orgName?: string,
  ) => Promise<void>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (organizationId: string, role: string) => boolean;
  hasPermission: (organizationId: string, permission: string) => boolean;
  hasAnyPermission: (organizationId: string, permissions: string[]) => boolean;
  hasAllPermissions: (organizationId: string, permissions: string[]) => boolean;
  getUserRole: (organizationId: string) => string | undefined;
  isOrganizationAdmin: (organizationId: string) => boolean;
  isSystemAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");

  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    try {
      const userData = await betterAuthService.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Failed to refresh user:", error);

      setUser(null);
      setSession(null);
      return null;
    }
  }, []);

  /**
   * Handle user login
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const result = await betterAuthService.login(email, password);

        setUser(result.user);
        setSession(result.session);

        toast({
          title: "Welcome back!",
          description: `Logged in as ${result.user.email}`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        toast({
          title: "Login failed",
          description: message,
          variant: "destructive",

        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],

  );

  /**
   * Handle user registration
   */
  const register = useCallback(
    async (email: string, password: string, orgName?: string) => {
      try {
        setIsLoading(true);
        const result = await betterAuthService.register(
          email,
          password,
          orgName,
        );


        setUser(result.user);
        setSession(result.session);

        toast({
          title: "Welcome!",
          description: "Account created successfully",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Registration failed";
        toast({
          title: "Registration failed",
          description: message,
          variant: "destructive",

        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast],

  );

  /**
   * Handle user logout
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await betterAuthService.logout();

      setUser(null);
      setSession(null);

      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);

      // Still clear local state even if server logout fails
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Role and permission helpers
   */
  const hasRole = useCallback(
    (organizationId: string, role: string): boolean => {
      if (!user) return false;
      return betterAuthService.hasRole(user, organizationId, role);
    },
    [user],

  );

  const hasPermission = useCallback(
    (organizationId: string, permission: string): boolean => {
      if (!user) return false;
      return betterAuthService.hasPermission(user, organizationId, permission);
    },
    [user],

  );

  const hasAnyPermission = useCallback(
    (organizationId: string, permissions: string[]): boolean => {
      if (!user) return false;
      return betterAuthService.hasAnyPermission(
        user,
        organizationId,
        permissions,
      );
    },
    [user],

  );

  const hasAllPermissions = useCallback(
    (organizationId: string, permissions: string[]): boolean => {
      if (!user) return false;
      return betterAuthService.hasAllPermissions(
        user,
        organizationId,
        permissions,
      );
    },
    [user],

  );

  const getUserRole = useCallback(
    (organizationId: string): string | undefined => {
      if (!user) return undefined;
      return betterAuthService.getUserRole(user, organizationId);
    },
    [user],

  );

  const isOrganizationAdmin = useCallback(
    (organizationId: string): boolean => {
      if (!user) return false;
      return betterAuthService.isOrganizationAdmin(user, organizationId);
    },
    [user],

  );

  const isSystemAdmin = useCallback((): boolean => {
    if (!user) return false;
    return betterAuthService.isSystemAdmin(user);
  }, [user]);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        let userData = await refreshUser();
        if (!userData) {
          const refreshed = await betterAuthService.refreshSession();
          if (refreshed) {
            userData = await refreshUser();
          }
        }
        if (userData) {
          console.log("User authenticated:", userData.email);
        } else {
          console.log("No active session found");
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);

      } finally {
        setIsLoading(false);
      }
    };

  initializeAuth();
}, []); // ✅ empty dependency array


  /**
   * Session timeout handling
   */
  useEffect(() => {
    if (!user || !session) return;

    const checkSessionTimeout = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(session.expiresAt).getTime();

      if (now >= expiresAt) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        logout();
      }
      };

      const interval = setInterval(checkSessionTimeout, 60 * 1000); // check every minute
      return () => clearInterval(interval); // ✅ cleanup

  }, [user, session]); // ✅ only re-run when user or session changes

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: async () => {
      await refreshUser();
    },
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserRole,
    isOrganizationAdmin,
    isSystemAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
