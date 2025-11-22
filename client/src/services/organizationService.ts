import { apiRequest } from "@/lib/queryClient";

export interface OrgMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  tenantId?: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  inviterName?: string;
  tenantId?: string;
  expiresAt?: string;
}

class OrganizationService {
  async listMembers(): Promise<OrgMember[]> {
    const res = await apiRequest("/api/team/users", "GET");
    const json = await res.json();
    return json as OrgMember[];
  }

  async updateMemberRole(userId: string, role: string): Promise<OrgMember> {
    const res = await apiRequest(`/api/team/users/${userId}`, "PATCH", { role });
    const json = await res.json();
    return json as OrgMember;
  }

  async removeMember(userId: string): Promise<void> {
    await apiRequest(`/api/team/users/${userId}`, "DELETE");
  }

  async listInvites(): Promise<OrgInvite[]> {
    const res = await apiRequest("/api/team/invites", "GET");
    const json = await res.json();
    return json as OrgInvite[];
  }

  async inviteMember(email: string, role: string, permissions: string[] = []): Promise<OrgInvite> {
    const res = await apiRequest("/api/team/invites", "POST", { email, role, permissions });
    const json = await res.json();
    return json as OrgInvite;
  }

  async revokeInvite(inviteId: string): Promise<void> {
    await apiRequest(`/api/team/invites/${inviteId}`, "DELETE");
  }
}

export const organizationService = new OrganizationService();