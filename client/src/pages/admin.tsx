import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Users, Trash2, Ban, CheckCircle, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tenant, User } from "@shared/schema";

const clubSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  clubTag: z.string().min(2, "Club tag must be at least 2 characters"),
  subscriptionPlan: z.enum(["starter", "growth", "enterprise"]),
  subscriptionStatus: z.enum(["active", "suspended", "canceled", "trial"]),
});

const suspendSchema = z.object({
  reason: z.string().min(1, "Please provide a reason for suspension"),
});

export default function AdminPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Tenant | null>(null);
  const [suspendingClub, setSuspendingClub] = useState<Tenant | null>(null);

  const { data: clubs = [], isLoading: loadingClubs } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/clubs"],
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const createClubMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clubSchema>) => {
      return await apiRequest("/api/admin/clubs", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "Club created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create club", variant: "destructive" });
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof clubSchema>> }) => {
      return await apiRequest(`/api/admin/clubs/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setEditingClub(null);
      toast({ title: "Success", description: "Club updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update club", variant: "destructive" });
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/clubs/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ title: "Success", description: "Club deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete club", variant: "destructive" });
    },
  });

  const suspendClubMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest(`/api/admin/clubs/${id}/suspend`, "POST", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      setSuspendingClub(null);
      toast({ title: "Success", description: "Club suspended successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to suspend club", variant: "destructive" });
    },
  });

  const reactivateClubMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/clubs/${id}/reactivate`, "POST", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clubs"] });
      toast({ title: "Success", description: "Club reactivated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reactivate club", variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof clubSchema>>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: "",
      clubTag: "",
      subscriptionPlan: "starter",
      subscriptionStatus: "trial",
    },
  });

  const suspendForm = useForm<z.infer<typeof suspendSchema>>({
    resolver: zodResolver(suspendSchema),
    defaultValues: {
      reason: "",
    },
  });

  const onSubmit = (data: z.infer<typeof clubSchema>) => {
    if (editingClub) {
      updateClubMutation.mutate({ id: editingClub.id, data });
    } else {
      createClubMutation.mutate(data);
    }
  };

  const handleEdit = (club: Tenant) => {
    setEditingClub(club);
    form.reset({
      name: club.name,
      clubTag: club.clubTag || "",
      subscriptionPlan: (club.subscriptionPlan as any) || "starter",
      subscriptionStatus: (club.subscriptionStatus as any) || "active",
    });
  };

  const onSuspendSubmit = (data: z.infer<typeof suspendSchema>) => {
    if (suspendingClub) {
      suspendClubMutation.mutate({ id: suspendingClub.id, reason: data.reason });
    }
  };

  const handleSuspendClick = (club: Tenant) => {
    if (club.subscriptionStatus === "suspended") {
      // Reactivate without dialog
      reactivateClubMutation.mutate(club.id);
    } else {
      // Show suspension dialog
      setSuspendingClub(club);
      suspendForm.reset({ reason: "" });
    }
  };

  const downloadDatabase = async () => {
    try {
      const response = await fetch("/api/admin/export-database", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export database");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexus-database-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Database exported successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export database", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all clubs and users</p>
        </div>
        <Button onClick={downloadDatabase} variant="outline" data-testid="button-export-database">
          <Download className="h-4 w-4 mr-2" />
          Export Database
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clubs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clubs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clubs.filter((c) => c.subscriptionStatus === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Clubs</CardTitle>
              <CardDescription>Manage all esports clubs</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen || !!editingClub} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                setEditingClub(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-club" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Club
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClub ? "Edit Club" : "Create New Club"}</DialogTitle>
                  <DialogDescription>
                    {editingClub ? "Update club details" : "Add a new esports club to the platform"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Team Liquid" data-testid="input-club-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clubTag"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club Tag</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="TL" data-testid="input-club-tag" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subscriptionPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Plan</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subscription-plan">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="starter">Starter</SelectItem>
                              <SelectItem value="growth">Growth</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subscriptionStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subscription Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subscription-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="canceled">Canceled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button
                        type="submit"
                        data-testid="button-submit-club"
                        disabled={createClubMutation.isPending || updateClubMutation.isPending}
                      >
                        {createClubMutation.isPending || updateClubMutation.isPending
                          ? "Saving..."
                          : editingClub
                          ? "Update"
                          : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingClubs ? (
            <p className="text-muted-foreground">Loading clubs...</p>
          ) : clubs.length === 0 ? (
            <p className="text-muted-foreground">No clubs yet</p>
          ) : (
            <div className="space-y-4">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`club-item-${club.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{club.name}</h3>
                      {club.clubTag && (
                        <Badge variant="outline" className="font-mono">
                          {club.clubTag}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={club.subscriptionStatus === "active" ? "default" : "secondary"}>
                        {club.subscriptionStatus}
                      </Badge>
                      <Badge variant="outline">{club.subscriptionPlan}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {users.filter((u) => u.tenantId === club.id).length} users
                      </span>
                    </div>
                    {club.subscriptionStatus === "suspended" && club.suspensionReason && (
                      <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                        <p className="text-destructive font-medium">Suspended: {club.suspensionReason}</p>
                        {club.suspendedAt && (
                          <p className="text-muted-foreground text-xs mt-1">
                            Since {formatDateSafe(club.suspendedAt, "PPP")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(club)}
                      data-testid={`button-edit-club-${club.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={club.subscriptionStatus === "suspended" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSuspendClick(club)}
                      data-testid={`button-suspend-club-${club.id}`}
                    >
                      {club.subscriptionStatus === "suspended" ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Reactivate
                        </>
                      ) : (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${club.name}? This action cannot be undone.`)) {
                          deleteClubMutation.mutate(club.id);
                        }
                      }}
                      data-testid={`button-delete-club-${club.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Management Section */}
      <UsersManagement users={users} loadingUsers={loadingUsers} />

      {/* Suspension Dialog */}
      <Dialog open={!!suspendingClub} onOpenChange={(open) => {
        if (!open) {
          setSuspendingClub(null);
          suspendForm.reset();
        }
      }}>
        <DialogContent data-testid="dialog-suspend-club">
          <DialogHeader>
            <DialogTitle>Suspend Club</DialogTitle>
            <DialogDescription>
              Provide a reason for suspending {suspendingClub?.name}. The club will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...suspendForm}>
            <form onSubmit={suspendForm.handleSubmit(onSuspendSubmit)} className="space-y-4">
              <FormField
                control={suspendForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suspension Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="e.g., Payment failure, Terms violation, etc."
                        rows={4}
                        data-testid="input-suspension-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSuspendingClub(null)}
                  data-testid="button-cancel-suspend"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={suspendClubMutation.isPending}
                  data-testid="button-confirm-suspend"
                >
                  {suspendClubMutation.isPending ? "Suspending..." : "Suspend Club"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Users Management Component
function UsersManagement({ users, loadingUsers }: { users: User[]; loadingUsers: boolean }) {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const userEditSchema = z.object({
    email: z.string().email("Invalid email address"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  });

  const userForm = useForm<z.infer<typeof userEditSchema>>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof userEditSchema> }) => {
      // Remove empty password from request
      const payload = { ...data };
      if (!payload.password) {
        delete payload.password;
      }
      return await apiRequest(`/api/admin/users/${id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user", 
        variant: "destructive" 
      });
    },
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.reset({
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      password: "",
    });
  };

  const onUserSubmit = (data: z.infer<typeof userEditSchema>) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts across all clubs</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users yet</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {user.firstName} {user.lastName}
                      </h3>
                      {user.isSuperAdmin && (
                        <Badge variant="default">Super Admin</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    data-testid={`button-edit-user-${user.id}`}
                  >
                    Edit Credentials
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => {
        if (!open) {
          setEditingUser(null);
          userForm.reset();
        }
      }}>
        <DialogContent data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Edit User Credentials</DialogTitle>
            <DialogDescription>
              Update user's email, name, and password for support purposes
            </DialogDescription>
          </DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <FormField
                control={userForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-user-firstname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-user-lastname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password" 
                        placeholder="Leave empty to keep current password"
                        data-testid="input-user-password" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  data-testid="button-cancel-edit-user"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  data-testid="button-submit-edit-user"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Safe date helpers for Firestore Timestamp/String/Number
const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const v: any = value;
  if (v && typeof v.toDate === "function") {
    try {
      const d = v.toDate();
      return d instanceof Date ? d : null;
    } catch {
      return null;
    }
  }
  if (v && typeof v.seconds === "number") {
    const millis = v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
    const d = new Date(millis);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};
const formatDateSafe = (value: unknown, fmt: string): string => {
  const d = toDateSafe(value);
  return d ? format(d, fmt) : "Invalid date";
};
