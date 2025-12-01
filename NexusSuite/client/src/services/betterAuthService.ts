/**
 * Better Auth Integration Service
 * Handles authentication with Better Auth backend using cookie-based sessions
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  roles?: Record<string, string>;
  permissions?: Record<string, string[]>;
  organizationId?: string;
  isSuperAdmin?: boolean;
}

export interface Session {
  token: string;
  expiresAt: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  session: Session;
}

export async function refreshUser() {
  try {
    // Use the unified auth endpoint provided by the server
    const response = await fetch('/api/auth/user', { credentials: 'include', cache: 'no-store' });
    if (!response.ok) throw new Error('User not found');
    // Support both plain user payload and { user } wrapper
    const data = await response.json();
    return data?.user ?? data;
  } catch (error) {
    console.warn('Failed to refresh user:', error);
    return null; // Prevents re-render loop
  }
}

class BetterAuthService {
  private apiUrl = '/api/auth';

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include', // Essential for cookie-based sessions

      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let msg = 'Login failed';

      try {
        const err = await response.json();
        msg = String(err?.message || msg);
      } catch {}
      if (response.status === 401) msg = 'Invalid email or password';

      throw new Error(msg);
    }

    return response.json();
  }

  /**
   * Register new user with optional organization
   */
  async register(email: string, password: string, orgName?: string): Promise<AuthResponse> {
    const response = await fetch(`${this.apiUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',

      body: JSON.stringify({ email, password, orgName }),
    });

    if (!response.ok) {
      let msg = 'Registration failed';

      try {
        const err = await response.json();
        msg = String(err?.message || msg);
      } catch {}
      if (response.status === 400 && /exist/i.test(msg)) msg = 'Email already exists';

      throw new Error(msg);
    }

    return response.json();
  }

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Server implements GET /api/auth/user
      const response = await fetch(`${this.apiUrl}/user`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated
        }
        throw new Error('Failed to get current user');
      }

      const data = await response.json();
      return data.user || data; // Handle both response formats
    } catch (error) {
      console.error('Error getting current user:', error);

      return null;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/logout`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Logout request failed, but continuing with client-side cleanup');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  /**
   * Refresh current session
   */
  async refreshSession(): Promise<User | null> {
    try {
      const response = await fetch(`${this.apiUrl}/session/refresh`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user || data;
    } catch (error) {
      console.error('Error refreshing session:', error);

      return null;
    }
  }

  /**
   * Check if user has specific role in organization
   */
  hasRole(user: User, organizationId: string, role: string): boolean {
    if (!user.roles) return false;
    return user.roles[organizationId] === role;
  }

  /**
   * Check if user has specific permission in organization
   */
  hasPermission(user: User, organizationId: string, permission: string): boolean {
    if (!user.permissions) return false;
    const orgPermissions = user.permissions[organizationId] || [];
    return orgPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User, organizationId: string, permissions: string[]): boolean {
    if (!user.permissions) return false;
    const orgPermissions = user.permissions[organizationId] || [];
    return permissions.some(permission => orgPermissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(user: User, organizationId: string, permissions: string[]): boolean {
    if (!user.permissions) return false;
    const orgPermissions = user.permissions[organizationId] || [];
    return permissions.every(permission => orgPermissions.includes(permission));
  }

  /**
   * Get user's role in organization
   */
  getUserRole(user: User, organizationId: string): string | undefined {
    return user.roles?.[organizationId];
  }

  /**
   * Get user's permissions in organization
   */
  getUserPermissions(user: User, organizationId: string): string[] {
    return user.permissions?.[organizationId] || [];
  }

  /**
   * Check if user is organization admin
   */
  isOrganizationAdmin(user: User, organizationId: string): boolean {
    return (
      this.hasRole(user, organizationId, 'admin') || this.hasRole(user, organizationId, 'owner')
    );
  }

  /**
   * Check if user is system admin
   */
  isSystemAdmin(user: User): boolean {
    return user.isSuperAdmin || false;
  }
}

export const betterAuthService = new BetterAuthService();
