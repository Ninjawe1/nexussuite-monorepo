import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, UserPlus, Copy, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Invite, Staff, Tenant } from "@shared/schema";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateSafe } from "@/lib/date";


import { useOrganization } from "@/contexts/OrganizationContext";

export default function Team() {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);

  // Fetch team users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/team/users", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(
        `/api/team/users?organizationId=${currentOrganization.id}`,
        "GET",
      );
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch pending invites
  const { data: invites = [], isLoading: invitesLoading } = useQuery<Invite[]>({
    queryKey: ["/api/team/invites", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(
        `/api/team/invites?organizationId=${currentOrganization.id}`,
        "GET",
      );
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });

  // Staff management state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | undefined>();

  const { data: staffMembers = [], isLoading: staffLoading } = useQuery<
    Staff[]
  >({
    queryKey: ["/api/staff", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const res = await apiRequest(
        `/api/staff?organizationId=${currentOrganization.id}`,
        "GET",
      );
      return await res.json();
    },
    enabled: !!currentOrganization?.id,
  });
  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/tenant"], // Tenant is usually global/user context, but keeping it as is unless known otherwise
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-team">
            Team
          </h1>
          <p className="text-muted-foreground">
            Manage team members and invitations
          </p>

        </div>
        <div className="flex gap-2">
          <Dialog open={inviteUserOpen} onOpenChange={setInviteUserOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-send-invite">
                <Mail className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <InviteUserForm onSuccess={() => setInviteUserOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateUserForm onSuccess={() => setCreateUserOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            Team Members ({users.length})
          </TabsTrigger>
          <TabsTrigger value="invites" data-testid="tab-invites">
            Pending Invites ({invites.length})
          </TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">
            Staff ({staffMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {usersLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No team members yet. Create a user or send an invite to get
                started.

              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {users.map((user) => (

                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          {invitesLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : invites.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending invites.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invites.map((invite) => (

                <InviteCard key={invite.id} invite={invite} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-base" data-testid={`user-name-${user.id}`}>
            {user.firstName} {user.lastName}
          </CardTitle>
          <CardDescription data-testid={`user-email-${user.id}`}>
            {user.email}
          </CardDescription>

        </div>
        <Badge data-testid={`user-role-${user.id}`}>{user.role}</Badge>
      </CardHeader>
    </Card>
  );
}

function InviteCard({ invite }: { invite: Invite }) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(
        `/api/team/invites/${invite.id}?organizationId=${currentOrganization?.id}`,
        "DELETE",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/team/invites", currentOrganization?.id],
      });
      toast({
        title: "Success",
        description: "Invite deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete invite",

      });
    },
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",

    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle
            className="text-base"
            data-testid={`invite-email-${invite.id}`}
          >
            {invite.email}
          </CardTitle>
          <CardDescription>
            Invited by {invite.inviterName} • Expires{" "}
            {formatDateSafe(invite.expiresAt, "MMM dd, yyyy")}

          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge data-testid={`invite-role-${invite.id}`}>{invite.role}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={copyInviteLink}
            data-testid={`button-copy-invite-${invite.id}`}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid={`button-delete-invite-${invite.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "staff",
    password: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest(
        `/api/team/users?organizationId=${currentOrganization?.id}`,
        "POST",
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/team/users", currentOrganization?.id],
      });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create user",

      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create User</DialogTitle>
        <DialogDescription>
          Create a new user account directly. They can log in immediately.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }

            required
            data-testid="input-create-email"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }

              required
              data-testid="input-create-firstname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }

              required
              data-testid="input-create-lastname"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}

          >
            <SelectTrigger data-testid="select-create-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="marcom">Marketing & Communications</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password (optional)</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }

            placeholder="Leave empty for default: Welcome123!"
            data-testid="input-create-password"
          />
          <p className="text-sm text-muted-foreground">
            If left empty, default password "Welcome123!" will be used
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createMutation.isPending}
          data-testid="button-submit-create"
        >
          {createMutation.isPending ? "Creating..." : "Create User"}

        </Button>
      </form>
    </>
  );
}

function InviteUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [formData, setFormData] = useState({
    email: "",
    role: "staff",
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest(
        `/api/team/invites?organizationId=${currentOrganization?.id}`,
        "POST",
        {
          ...data,
          permissions: [],
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/team/invites", currentOrganization?.id],
      });
      toast({
        title: "Success",
        description: "Invite sent successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send invite",

      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send Invite</DialogTitle>
        <DialogDescription>
          Send an invitation link to a new team member. They'll create their own
          account.

        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }

            required
            data-testid="input-invite-email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}

          >
            <SelectTrigger data-testid="select-invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="marcom">Marketing & Communications</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={inviteMutation.isPending}
          data-testid="button-submit-invite"
        >
          {inviteMutation.isPending ? "Sending..." : "Send Invite"}

        </Button>
      </form>
    </>
  );
}
