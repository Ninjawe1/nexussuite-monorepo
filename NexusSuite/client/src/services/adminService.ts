/**
 * Admin Service for System Administration
 * Handles admin-specific operations and system management
 */

import { apiRequest } from '@/lib/queryClient';

export interface SystemMetrics {
  totalUsers: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyGrowth: {
    users: number;
    organizations: number;
    revenue: number;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down';

    uptime: number;
    responseTime: number;
    lastCheck: string;
  };
}

export interface UserAnalytics {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
  subscriptionStatus: 'active' | 'canceled' | 'trialing' | 'none';

  usage: {
    apiCalls: number;
    storage: number;
    lastActivity: string;
  };
  status: 'active' | 'suspended' | 'deleted';
}

export interface OrganizationAnalytics {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    name: string;
  };
  members: number;
  subscription: {
    plan: string;
    status: 'active' | 'canceled' | 'trialing' | 'none';

    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    apiCalls: number;
    storage: number;
    lastActivity: string;
  };
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  organizationId?: string;
  organizationName?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  organizationId?: string;
  organizationName?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  assignedTo?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface AdminUserUpdate {
  email?: string;
  name?: string;
  role?: string;
  status?: 'active' | 'suspended' | 'deleted';

  metadata?: Record<string, any>;
}

export interface AdminOrganizationUpdate {
  name?: string;
  slug?: string;
  status?: 'active' | 'suspended';

  metadata?: Record<string, any>;
}

class AdminService {
  /**
   * Get system-wide metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const response = await apiRequest('/api/admin/metrics', 'GET');
      const data = await response.json();
      return data.data || data.metrics;
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      throw new Error('Unable to load system metrics');
    }
  }

  /**
   * Get user analytics with filtering and pagination
   */
  async getUserAnalytics(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      subscriptionStatus?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    users: UserAnalytics[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiRequest(
        `/api/admin/users/analytics?${queryParams.toString()}`,
        'GET'
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch user analytics:', error);
      throw new Error('Unable to load user analytics');
    }
  }

  /**
   * Get organization analytics with filtering and pagination
   */
  async getOrganizationAnalytics(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      subscriptionStatus?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    organizations: OrganizationAnalytics[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiRequest(
        `/api/admin/organizations/analytics?${queryParams.toString()}`,
        'GET'
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch organization analytics:', error);
      throw new Error('Unable to load organization analytics');
    }
  }

  /**
   * Update user as admin
   */
  async updateUser(userId: string, updates: AdminUserUpdate): Promise<UserAnalytics> {
    try {
      const response = await apiRequest(`/api/admin/users/${userId}`, 'PUT', updates);

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw new Error('Unable to update user');
    }
  }

  /**
   * Suspend user account
   */
  async suspendUser(userId: string, reason?: string): Promise<void> {
    try {
      await apiRequest(`/api/admin/users/${userId}/suspend`, 'POST', { reason });
    } catch (error) {
      console.error('Failed to suspend user:', error);
      throw new Error('Unable to suspend user');
    }
  }

  /**
   * Reactivate suspended user account
   */
  async reactivateUser(userId: string): Promise<void> {
    try {
      await apiRequest(`/api/admin/users/${userId}/reactivate`, 'POST');
    } catch (error) {
      console.error('Failed to reactivate user:', error);
      throw new Error('Unable to reactivate user');
    }
  }

  /**
   * Update organization as admin
   */
  async updateOrganization(
    orgId: string,
    updates: AdminOrganizationUpdate
  ): Promise<OrganizationAnalytics> {
    try {
      const response = await apiRequest(`/api/admin/organizations/${orgId}`, 'PUT', updates);

      const data = await response.json();
      return data.organization;
    } catch (error) {
      console.error('Failed to update organization:', error);
      throw new Error('Unable to update organization');
    }
  }

  /**
   * Suspend organization
   */
  async suspendOrganization(orgId: string, reason?: string): Promise<void> {
    try {
      await apiRequest(`/api/admin/organizations/${orgId}/suspend`, 'POST', { reason });
    } catch (error) {
      console.error('Failed to suspend organization:', error);
      throw new Error('Unable to suspend organization');
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(
    params: {
      page?: number;
      limit?: number;
      userId?: string;
      organizationId?: string;
      action?: string;
      resource?: string;
      severity?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiRequest(`/api/admin/audit-logs?${queryParams.toString()}`, 'GET');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      throw new Error('Unable to load audit logs');
    }
  }

  /**
   * Get support tickets with filtering and pagination
   */
  async getSupportTickets(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      assignedTo?: string;
      userId?: string;
      organizationId?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    tickets: SupportTicket[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await apiRequest(
        `/api/admin/support-tickets?${queryParams.toString()}`,
        'GET'
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch support tickets:', error);
      throw new Error('Unable to load support tickets');
    }
  }

  /**
   * Update support ticket
   */
  async updateSupportTicket(
    ticketId: string,
    updates: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      tags?: string[];
      notes?: string;
    }
  ): Promise<SupportTicket> {
    try {
      const response = await apiRequest(`/api/admin/support-tickets/${ticketId}`, 'PUT', updates);

      const data = await response.json();
      return data.ticket;
    } catch (error) {
      console.error('Failed to update support ticket:', error);
      throw new Error('Unable to update support ticket');
    }
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<Record<string, any>> {
    try {
      const response = await apiRequest('/api/admin/system-settings', 'GET');
      const data = await response.json();
      return data.data || data.config;
    } catch (error) {
      console.error('Failed to fetch system config:', error);
      throw new Error('Unable to load system configuration');
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    try {
      await apiRequest('/api/admin/system-settings', 'PUT', config);
    } catch (error) {
      console.error('Failed to update system config:', error);
      throw new Error('Unable to update system configuration');
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';

      message?: string;
      lastCheck: string;
    }>;
    lastCheck: string;
  }> {
    try {
      const response = await apiRequest('/api/admin/metrics', 'GET');
      const data = await response.json();
      return {
        status: (data?.data?.systemHealth?.status || 'healthy') as any,
        checks: [
          {
            name: 'api',
            status: 'pass',

            lastCheck: new Date().toISOString(),
          },
        ],
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      throw new Error('Unable to load system health');
    }
  }
}

// Export a named singleton instance for convenient imports throughout the app
export const adminService = new AdminService();
