import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, UserPlus, Copy, Trash2 } from "lucide-react";
import { organizationService, type OrgMember, type OrgInvite } from "@/services/organizationService";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatDateSafe } from "@/lib/date";

export default function OrgMembersPage() {
  const { currentMembership } = useOrganization();
  const role = (currentMembership?.role || "").toLowerCase();
  const canManage = role === "owner" || role === "admin";

  const { data: members = [], isLoading: membersLoading } = useQuery<OrgMember[]>({
    queryKey: ["/api/team/users"],
    queryFn: () => organizationService.listMembers(),
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery<OrgInvite[]>({
    queryKey: ["/api/team/invites"],
    queryFn: () => organizationService.listInvites(),
  });

  const [inviteOpen, setInviteOpen] = useState(false);

  if (!canManage) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              You need to be an organization owner or admin to manage members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Members</h1>
          <p className="text-muted-foreground">Manage members and pending invites</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <InviteUserForm onSuccess={() => setInviteOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members ({members.length})</CardTitle>
            <CardDescription>Existing users in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="text-center py-6">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground">No members yet.</p>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invites ({invites.length})</CardTitle>
            <CardDescription>Invitations awaiting acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="text-center py-6">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
              </div>
            ) : invites.length === 0 ? (
              <p className="text-muted-foreground">No pending invites.</p>
            ) : (
              <div className="space-y-3">
                {invites.map((i) => (
                  <InviteRow key={i.id} invite={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: OrgMember }) {
  const { toast } = useToast();

  const updateRole = useMutation({
    mutationFn: async (role: string) => organizationService.updateMemberRole(member.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/users"] });
      toast({ title: "Updated", description: "Member role updated" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to update role" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async () => organizationService.removeMember(member.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/users"] });
      toast({ title: "Removed", description: "Member removed from organization" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to remove member" });
    },
  });

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{member.firstName} {member.lastName}</div>
        <div className="text-sm text-muted-foreground truncate">{member.email}</div>
      </div>
      <Badge>{member.role}</Badge>
      <Select onValueChange={(v) => updateRole.mutate(v)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Change role" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={() => removeMember.mutate()} disabled={removeMember.isPending}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

function InviteRow({ invite }: { invite: OrgInvite }) {
  const { toast } = useToast();

  const revoke = useMutation({
    mutationFn: async () => organizationService.revokeInvite(invite.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invites"] });
      toast({ title: "Revoked", description: "Invite cancelled" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to revoke invite" });
    },
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Invite link copied to clipboard" });
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{invite.email}</div>
        <div className="text-sm text-muted-foreground">Invited by {invite.inviterName ?? "Unknown"} • Expires {formatDateSafe(invite.expiresAt || new Date().toISOString(), "MMM dd, yyyy")}</div>
      </div>
      <Badge>{invite.role}</Badge>
      <Button variant="outline" size="sm" onClick={copyInviteLink}><Copy className="w-4 h-4" /></Button>
      <Button variant="outline" size="sm" onClick={() => revoke.mutate()} disabled={revoke.isPending}><Trash2 className="w-4 h-4" /></Button>
    </div>
  );
}

function InviteUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ email: "", role: "staff" });

  const inviteMutation = useMutation({
    mutationFn: async () => organizationService.inviteMember(formData.email, formData.role, []),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invites"] });
      toast({ title: "Success", description: "Invite sent successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error?.message || "Failed to send invite" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send Invite</DialogTitle>
        <DialogDescription>Invite a new member to your organization</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? "Sending..." : "Send Invite"}
        </Button>
      </form>
    </>
  );
}