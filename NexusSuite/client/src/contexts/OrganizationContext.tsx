/**
 * Organization Context for Multi-Organization Management
 * Handles organization selection, switching, and organization-specific data
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    description?: string;
    website?: string;
    industry?: string;
  };
}

export interface OrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id?: string;
  userId: string;
  role?: string;
  email?: string;
  name?: string;
  joinedAt?: string | Date;
  updatedAt?: string | Date;
  isActive?: boolean;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentMembership: OrganizationMembership | null;
  isLoading: boolean;
  isSwitching: boolean;
  selectOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, slug?: string) => Promise<Organization>;
  updateOrganization: (
    organizationId: string,
    updates: Partial<Organization>,
  ) => Promise<void>;

  deleteOrganization: (organizationId: string) => Promise<void>;
  canAccessOrganization: (organizationId: string) => boolean;
  // Members management
  listMembers: () => Promise<OrgMember[]>;
  listInvites: () => Promise<any[]>;
  resendInvite: (inviteId: string) => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  inviteMember: (email: string, role: string, name?: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  updateMemberStatus: (memberId: string, isActive: boolean) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);


export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );

  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({
  children,
}) => {

  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] =
    useState<Organization | null>(null);
  const [currentMembership, setCurrentMembership] =
    useState<OrganizationMembership | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  /**
   * Fetch user's organizations
   */
  const fetchOrganizations = useCallback(async (): Promise<Organization[]> => {
    try {
      const response = await apiRequest("/api/auth/user", "GET");

      const data = await response.json();

      // Prefer explicit organizations array if provided
      const userOrgs = data?.organizations || data?.user?.organizations || [];
      if (Array.isArray(userOrgs) && userOrgs.length > 0) {
        return userOrgs.map((org: any) => ({
          id: org.organizationId || org.id,
          name: org.organization?.name || org.name || "Unknown Organization",
          slug: (org.organization?.slug || org.slug || org.organizationId || org.id || "").toString(),

          createdAt: org.createdAt || new Date().toISOString(),
          updatedAt: org.updatedAt || new Date().toISOString(),
          metadata: org.organization?.metadata || org.metadata || {},
        }));
      }

      // Fallback: derive a single org from tenantId on the user
      const tenantId = data?.tenantId || data?.user?.tenantId;
      if (tenantId) {
        const derivedName =
          data?.tenant?.name ||
          data?.clubName ||
          (data?.firstName ? `${data.firstName}'s Club` : data?.email || "My Club");


        return [
          {
            id: String(tenantId),
            name: String(derivedName),
            slug: String(tenantId),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {},
          },
        ];
      }

      // No organizations available
      return [];
    } 
    catch (error) {
      // Gracefully handle missing endpoints on public landing page
      console.warn("Failed to fetch organizations (non-blocking):", error);
      return [];
    }
  }, []);
  

  /**
   * Refresh organizations list
   */
  const refreshOrganizations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);

      // Update current organization if it's still valid
      if (
        currentOrganization &&
        !orgs.find((org) => org.id === currentOrganization.id)
      ) {

        // Current org no longer exists or user lost access
        setCurrentOrganization(null);
        setCurrentMembership(null);

        // Auto-select first available organization
        if (orgs.length > 0) {
          await selectOrganization(orgs[0].id);
        }
      }
    } catch (error) {
      toast({
        title: "Failed to refresh organizations",
        description: "Unable to load your organizations",
        variant: "destructive",

      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentOrganization, fetchOrganizations, toast]);

  /**
   * Select and switch to a different organization
   */
  const selectOrganization = useCallback(
    async (organizationId: string, orgList?: Organization[]) => {
      if (!isAuthenticated) return;
      setIsSwitching(true);

      // Prefer provided orgList (freshly fetched) to avoid races with state updates
      const source = orgList && orgList.length ? orgList : organizations;
      let org = source.find((o) => o.id === organizationId) || null;


      // If not found, attempt a fresh fetch once before failing
      if (!org) {
        try {
          const fresh = await fetchOrganizations();
          setOrganizations(fresh);
          org = fresh.find((o) => o.id === organizationId) || null;
        } catch (err) {
          console.warn("Failed to refresh organizations during selection:", err);

        }
      }

      if (!org) {
        // Gracefully handle missing org without throwing
        setCurrentOrganization(null);
        setCurrentMembership(null);
        toast({
          title: "Organization not found",
          description: "Please select a valid organization.",
          variant: "destructive",

        });
        setIsSwitching(false);
        return;
      }

      setCurrentOrganization(org);

      try {
        const response = await apiRequest("/api/auth/user", "GET");
        const data = await response.json();
        const role = data?.role || data?.user?.role || "owner";
        const userId = String(data?.id || data?.user?.id || "user");


        setCurrentMembership({
          id: `${userId}-${organizationId}`,
          userId,
          organizationId,
          role,
          permissions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        setCurrentMembership(null);
      } finally {
        localStorage.setItem("selectedOrganizationId", organizationId);

        setIsSwitching(false);
      }
    },
    [isAuthenticated, organizations, fetchOrganizations, toast]
  );
 


  /**
   * Create a new organization
   */
  const createOrganization = useCallback(
    async (name: string, slug?: string) => {
      if (!isAuthenticated) throw new Error("Must be authenticated");

      try {
        const response = await apiRequest("/api/organizations", "POST", {
          "Content-Type": "application/json",
          name,
          slug,
        })


        const newOrg = await response.json();

        // Refresh organizations list
        await refreshOrganizations();

        // Auto-select the new organization
        await selectOrganization(newOrg.id);

        toast({
          title: "Organization created",

          description: `${name} has been created successfully`,
        });

        return newOrg;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create organization";
        toast({
          title: "Creation failed",
          description: message,
          variant: "destructive",

        });
        throw error;
      }
    },
    [isAuthenticated, refreshOrganizations, selectOrganization, toast],

  );

  /**
   * Update organization details
   */
  const updateOrganization = useCallback(
    async (organizationId: string, updates: Partial<Organization>) => {
      try {
        // Server treats organization as current tenant; call unified endpoint
        await apiRequest(`/api/tenant`, "PATCH", {
          "Content-Type": "application/json",

          ...updates,
        });

        // Refresh organizations list
        await refreshOrganizations();

        toast({
          title: "Organization updated",
          description: "Changes saved successfully",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update organization";
        toast({
          title: "Update failed",
          description: message,
          variant: "destructive",

        });
        throw error;
      }
    },
    [refreshOrganizations, toast],

  );

  /**
   * Delete organization
   */
  const deleteOrganization = useCallback(
    async (organizationId: string) => {
      try {
        // Server treats organization as current tenant; call unified endpoint
        await apiRequest(`/api/tenant`, "DELETE");


        // Refresh organizations list
        await refreshOrganizations();

        toast({
          title: "Organization deleted",
          description: "Organization has been removed",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete organization";
        toast({
          title: "Deletion failed",
          description: message,
          variant: "destructive",

        });
        throw error;
      }
    },
    [refreshOrganizations, toast],

  );

  /**
   * List organization members (owner/admin only)
   */
  const listMembers = useCallback(async (): Promise<OrgMember[]> => {
    try {
      const response = await apiRequest("/api/tenant/members", "GET");

      const members = await response.json();
      return (members || []).map((m: any) => ({
        id: String(m.id || m.userId),
        userId: String(m.userId),
        role: String(m.role || ""),

        email: m.user?.email || m.email,
        name: m.user?.name || m.name,
        joinedAt: m.joinedAt,
        updatedAt: m.updatedAt,
        isActive: !!m.isActive,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load members";
      toast({
        title: "Unable to load members",
        description: message,
        variant: "destructive",

      });
      return [];
    }
  }, [toast]);

  const listInvites = useCallback(async (): Promise<any[]> => {
    try {
      const response = await apiRequest("/api/tenant/invites", "GET");
      const invites = await response.json();
      return invites || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load invitations";
      toast({ title: "Unable to load invitations", description: message, variant: "destructive" });

      return [];
    }
  }, [toast]);

  const resendInvite = useCallback(async (inviteId: string) => {
    try {
      await apiRequest(`/api/tenant/invites/${inviteId}/resend`, "POST");
      toast({ title: "Invitation resent" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resend invitation";
      toast({ title: "Resend failed", description: message, variant: "destructive" });
      throw error;
    }
  }, [toast]);

  const cancelInvite = useCallback(async (inviteId: string) => {
    try {
      await apiRequest(`/api/tenant/invites/${inviteId}/cancel`, "PATCH");
      toast({ title: "Invitation cancelled" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel invitation";
      toast({ title: "Cancel failed", description: message, variant: "destructive" });
      throw error;
    }
  }, [toast]);


  /**
   * Invite/add a member by email with a role (owner/admin only; owner role requires owner)
   */
  const inviteMember = useCallback(async (email: string, role: string, name?: string) => {
    try {
      await apiRequest("/api/tenant/members", "POST", {
        "Content-Type": "application/json",
        email,
        role,
        name,
      });
      const who = name ? `${name} <${email}>` : email;
      toast({ title: "Member invited", description: who });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to invite member";
      toast({ title: "Invite failed", description: message, variant: "destructive" });
      throw error;
    }
  }, [toast]);


  /**
   * Update an existing member's role (owner-only when assigning owner)
   */
  const updateMemberRole = useCallback(async (memberId: string, role: string) => {
    try {
      await apiRequest(`/api/tenant/members/${memberId}`, "PATCH", {
        "Content-Type": "application/json",
        role,
      });
      toast({ title: "Role updated", description: `Member role is now ${role}` });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update member role";
      toast({ title: "Update failed", description: message, variant: "destructive" });
      throw error;
    }
  }, [toast]);

  const updateMemberStatus = useCallback(async (memberId: string, isActive: boolean) => {
    try {
      await apiRequest(`/api/tenant/members/${memberId}/status`, "PATCH", {
        "Content-Type": "application/json",
        isActive,
      });
      toast({ title: isActive ? "Member activated" : "Member deactivated" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update member status";
      toast({ title: "Update failed", description: message, variant: "destructive" });
      throw error;
    }
  }, [toast]);


  /**
   * Remove a member (cannot remove owner)
   */
  const removeMember = useCallback(async (memberId: string) => {
    try {
      await apiRequest(`/api/tenant/members/${memberId}`, "DELETE");
      toast({ title: "Member removed", description: memberId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      toast({ title: "Remove failed", description: message, variant: "destructive" });
      throw error;
    }
  }, [toast]);


  /**
   * Check if user can access an organization
   */
  const canAccessOrganization = useCallback(
    (organizationId: string): boolean => {
      return organizations.some((org) => org.id === organizationId);
    },
    [organizations],

  );

  /**
   * Initialize organization context
   */
  useEffect(() => {
    const initializeOrganizations = async () => {
      if (!isAuthenticated) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setCurrentMembership(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const orgs = await fetchOrganizations();
        setOrganizations(orgs);

        // Try to restore previously selected organization
        const savedOrgId = localStorage.getItem("selectedOrganizationId");
        const validSavedOrg =
          savedOrgId && orgs.find((org) => org.id === savedOrgId);


        if (validSavedOrg) {
          await selectOrganization(savedOrgId, orgs);
        } else if (orgs.length > 0) {
          await selectOrganization(orgs[0].id, orgs);
        } else {
          const hinted = localStorage.getItem("org_onboarding_hinted") === "1";
          if (!hinted) {
            toast({ title: "No organizations found", description: "Create your first organization to get started", variant: "destructive" });
            localStorage.setItem("org_onboarding_hinted", "1");
          }
        }
      } catch (error) {
        console.error("Failed to initialize organizations:", error);

      } finally {
        setIsLoading(false);
      }
    };

    initializeOrganizations();
    // Note: keep dependency minimal to avoid re-running on every organizations change
    // which could cause an infinite loop via selectOrganization.
  }, [isAuthenticated]);

  const value: OrganizationContextType = {
    organizations,
    currentOrganization,
    currentMembership,
    isLoading,
    isSwitching,
    selectOrganization,
    refreshOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    canAccessOrganization,
    listMembers,
    listInvites,
    resendInvite,
    cancelInvite,
    inviteMember,
    updateMemberRole,
    updateMemberStatus,
    removeMember,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );

};

export default OrganizationContext;
