/**
 * Admin Dashboard - Main System Administration Interface
 * Provides comprehensive admin tools for managing users, organizations, and system operations
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminService,
  UserAnalytics,
  OrganizationAnalytics,
  AuditLog,
  SupportTicket,
} from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Users,
  Building2,
  Activity,
  Search,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  RefreshCw,
  Settings,
  MessageSquare,
  Building,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface AdminDashboardProps {
  className?: string;
}

interface SystemMetrics {
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
    status: "healthy" | "degraded" | "down";
    uptime: number;
    responseTime: number;
    lastCheck: string;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  className = "",
}) => {
  const { user, isSystemAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null,
  );
  const [users, setUsers] = useState<UserAnalytics[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationAnalytics[]>(
    [],
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search and filter states
  const [userSearch, setUserSearch] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);

  const [userTotal, setUserTotal] = useState(0);
  const [orgTotal, setOrgTotal] = useState(0);
  const [logTotal, setLogTotal] = useState(0);
  const [ticketTotal, setTicketTotal] = useState(0);

  const itemsPerPage = 10;

  /**
   * Load system metrics
   */
  const loadSystemMetrics = async () => {
    try {
      const metrics = await adminService.getSystemMetrics();
      setSystemMetrics(metrics);
    } catch (error) {
      console.error("Failed to load system metrics:", error);
      toast({
        title: "Failed to load system metrics",
        description: "Unable to retrieve system statistics",
        variant: "destructive",
      });
    }
  };

  /**
   * Load users
   */
  const loadUsers = async () => {
    try {
      const result = await adminService.getUserAnalytics({
        page: userPage,
        limit: itemsPerPage,
        search: userSearch || undefined,
      });
      setUsers(result.users);
      setUserTotal(result.total);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({
        title: "Failed to load users",
        description: "Unable to retrieve user data",
        variant: "destructive",
      });
    }
  };

  /**
   * Load organizations
   */
  const loadOrganizations = async () => {
    try {
      const result = await adminService.getOrganizationAnalytics({
        page: orgPage,
        limit: itemsPerPage,
        search: orgSearch || undefined,
      });
      setOrganizations(result.organizations);
      setOrgTotal(result.total);
    } catch (error) {
      console.error("Failed to load organizations:", error);
      toast({
        title: "Failed to load organizations",
        description: "Unable to retrieve organization data",
        variant: "destructive",
      });
    }
  };

  /**
   * Load audit logs
   */
  const loadAuditLogs = async () => {
    try {
      const result = await adminService.getAuditLogs({
        page: logPage,
        limit: itemsPerPage,
        action: logSearch || undefined,
      });
      setAuditLogs(result.logs);
      setLogTotal(result.total);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      toast({
        title: "Failed to load audit logs",
        description: "Unable to retrieve audit logs",
        variant: "destructive",
      });
    }
  };

  /**
   * Load support tickets
   */
  const loadSupportTickets = async () => {
    try {
      const result = await adminService.getSupportTickets({
        page: ticketPage,
        limit: itemsPerPage,
        search: ticketSearch || undefined,
      });
      setSupportTickets(result.tickets);
      setTicketTotal(result.total);
    } catch (error) {
      console.error("Failed to load support tickets:", error);
      toast({
        title: "Failed to load support tickets",
        description: "Unable to retrieve support tickets",
        variant: "destructive",
      });
    }
  };

  /**
   * Refresh all data
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadSystemMetrics(),
      loadUsers(),
      loadOrganizations(),
      loadAuditLogs(),
      loadSupportTickets(),
    ]);
    setIsRefreshing(false);

    toast({
      title: "Data refreshed",
      description: "All admin data has been updated",
    });
  };

  /**
   * Get status badge variant
   */
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
      case "open":
      case "healthy":
        return "default";
      case "suspended":
      case "in_progress":
      case "degraded":
        return "secondary";
      case "canceled":
      case "closed":
      case "down":
        return "outline";
      case "resolved":
        return "success";
      default:
        return "secondary";
    }
  };

  /**
   * Get priority badge variant
   */
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  /**
   * Get growth indicator
   */
  const getGrowthIndicator = (growth: number) => {
    if (growth > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+{growth.toFixed(1)}%</span>
        </div>
      );
    } else if (growth < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">{growth.toFixed(1)}%</span>
        </div>
      );
    }
    return null;
  };

  /**
   * Render pagination
   */
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void,
  ) => {
    if (totalPages <= 1) return null;

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const page =
              Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <PaginationEllipsis />
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  useEffect(() => {
    if (!isSystemAdmin()) {
      navigate("/dashboard");
      toast({
        title: "Access denied",
        description: "Admin access required",
        variant: "destructive",
      });
      return;
    }

    loadSystemMetrics();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [userPage, userSearch]);

  useEffect(() => {
    loadOrganizations();
  }, [orgPage, orgSearch]);

  useEffect(() => {
    loadAuditLogs();
  }, [logPage, logSearch]);

  useEffect(() => {
    loadSupportTickets();
  }, [ticketPage, ticketSearch]);

  if (!isSystemAdmin()) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                System administration and monitoring
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* System Overview Cards */}
        {systemMetrics && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.totalUsers.toLocaleString()}
                </div>
                {getGrowthIndicator(systemMetrics.monthlyGrowth.users)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Organizations
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.totalOrganizations.toLocaleString()}
                </div>
                {getGrowthIndicator(systemMetrics.monthlyGrowth.organizations)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Subscriptions
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics.activeSubscriptions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(
                    (systemMetrics.activeSubscriptions /
                      systemMetrics.totalOrganizations) *
                    100
                  ).toFixed(1)}
                  % conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${systemMetrics.totalRevenue.toLocaleString()}
                </div>
                {getGrowthIndicator(systemMetrics.monthlyGrowth.revenue)}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      View and manage all platform users
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Organizations</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {user.organizations.length}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.status) as any}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt
                            ? format(new Date(user.lastLoginAt), "MMM dd, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4">
                  {renderPagination(
                    userPage,
                    Math.ceil(userTotal / itemsPerPage),
                    setUserPage,
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organization Management</CardTitle>
                    <CardDescription>
                      View and manage all organizations
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search organizations..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">
                          {org.name}
                        </TableCell>
                        <TableCell>{org.owner.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {org.members}
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.subscription ? (
                            <Badge variant="outline">
                              {org.subscription.plan}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Free</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant("active") as any}>
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(org.createdAt), "MMM dd, yyyy")}
                        </TableCell>    
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4">
                  {renderPagination(
                    orgPage,
                    Math.ceil(orgTotal / itemsPerPage),
                    setOrgPage,
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>
                      System activity and security events
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(
                            new Date(log.createdAt),
                            "MMM dd, yyyy HH:mm",
                          )}
                        </TableCell>
                        <TableCell>{log.userEmail}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.resource}</TableCell>
                        <TableCell>{log.organizationName || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4">
                  {renderPagination(
                    logPage,
                    Math.ceil(logTotal / itemsPerPage),
                    setLogPage,
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Support Tickets</CardTitle>
                    <CardDescription>
                      User support requests and issues
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tickets..."
                      value={ticketSearch}
                      onChange={(e) => setTicketSearch(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supportTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">
                          {ticket.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {ticket.subject}
                        </TableCell>
                        <TableCell>{ticket.userEmail}</TableCell>
                        <TableCell>{ticket.organizationName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ticket.status) as any}>
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPriorityBadgeVariant(ticket.priority) as any}
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(ticket.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4">
                  {renderPagination(
                    ticketPage,
                    Math.ceil(ticketTotal / itemsPerPage),
                    setTicketPage,
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
