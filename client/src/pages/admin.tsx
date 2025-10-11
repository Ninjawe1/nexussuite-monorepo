import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Users, Trash2, Ban, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Tenant, User } from "@shared/schema";

const clubSchema = z.object({
  name: z.string().min(1, "Club name is required"),
  clubTag: z.string().min(2, "Club tag must be at least 2 characters"),
  subscriptionPlan: z.enum(["starter", "growth", "enterprise"]),
  subscriptionStatus: z.enum(["active", "suspended", "canceled", "trial"]),
});

export default function AdminPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Tenant | null>(null);

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

  const form = useForm<z.infer<typeof clubSchema>>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: "",
      clubTag: "",
      subscriptionPlan: "starter",
      subscriptionStatus: "trial",
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

  const suspendClub = (club: Tenant) => {
    updateClubMutation.mutate({
      id: club.id,
      data: { subscriptionStatus: club.subscriptionStatus === "suspended" ? "active" : "suspended" },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all clubs and users</p>
        </div>
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
                      onClick={() => suspendClub(club)}
                      data-testid={`button-suspend-club-${club.id}`}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      {club.subscriptionStatus === "suspended" ? "Activate" : "Suspend"}
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
    </div>
  );
}
