import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { useOrganization, OrgMember } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import InviteMemberModal from "@/components/InviteMemberModal";
import RoleSelectDropdown from "@/components/RoleSelectDropdown";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";

export default function MembersManagement() {
  const { listMembers, listInvites, resendInvite, cancelInvite, updateMemberRole, updateMemberStatus, removeMember, currentMembership } = useOrganization();
  const { toast } = useToast();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const requesterRole = (currentMembership?.role || "").toLowerCase();
  const canManage = requesterRole === "owner" || requesterRole === "admin";

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const data = await listMembers();
      setMembers(data);
      const inv = await listInvites();
      setInvites(inv);
    } catch (error) {
      // Toast already handled in context
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await updateMemberRole(memberId, role);
      await loadMembers();
    } catch (error) {
      // handled
    }
  };

  const handleRemove = async () => {
    if (!confirmId) return;
    try {
      await removeMember(confirmId);
      setConfirmId(null);
      await loadMembers();
    } catch (error) {
      // handled
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Organization Members</CardTitle>
            <p className="text-sm text-muted-foreground">Manage team members, roles, and invitations.</p>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading members...</div>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => {
                    const name = m.name || m.email || m.userId;
                    const joined = m.joinedAt ? new Date(m.joinedAt as any).toLocaleDateString() : "-";
                    const isOwner = String(m.role || "").toLowerCase() === "owner";
                    return (
                      <TableRow key={m.userId} className="odd:bg-muted/30">
                        <TableCell className="py-3">{name}</TableCell>
                        <TableCell className="py-3">{m.email || "-"}</TableCell>
                        <TableCell className="py-3">
                          {canManage ? (
                            <RoleSelectDropdown
                              value={String(m.role || "admin")}
                              onChange={(val) => handleRoleChange(m.userId, val)}
                              disabled={isOwner && requesterRole !== "owner"}
                              className="w-[200px]"
                            />
                          ) : (
                            <Badge variant="secondary" className="capitalize">{String(m.role || "admin")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3">{joined}</TableCell>
                        {canManage && (
                          <TableCell className="py-3 flex gap-2">
                            <Button
                              variant={m.isActive ? "secondary" : "default"}
                              size="sm"
                              onClick={() => updateMemberStatus(String(m.id || m.userId), !m.isActive)}
                              disabled={isOwner}
                            >
                              {m.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmId(String(m.id || m.userId))}
                              disabled={isOwner}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {members.length === 0 && (
                <div className="text-sm text-muted-foreground p-3">No members yet.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invites || []).map((i: any) => (
                  <TableRow key={i.id} className="odd:bg-muted/30">
                    <TableCell className="py-3">{i.email}</TableCell>
                    <TableCell className="py-3"><Badge className="capitalize" variant="secondary">{String(i.role || "member")}</Badge></TableCell>
                    <TableCell className="py-3"><Badge variant={String(i.status).toLowerCase() === "pending" ? "outline" : "default"}>{String(i.status)}</Badge></TableCell>
                    <TableCell className="py-3">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="py-3">{i.expiresAt ? new Date(i.expiresAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="py-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={async () => { await resendInvite(i.id); await loadMembers(); }} disabled={String(i.status).toLowerCase() !== "pending"}>Resend</Button>
                      <Button size="sm" variant="destructive" onClick={async () => { await cancelInvite(i.id); await loadMembers(); }} disabled={String(i.status).toLowerCase() !== "pending"}>Cancel</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!invites || invites.length === 0) && (
              <div className="text-sm text-muted-foreground p-3">No pending invitations.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite member modal */}
      <InviteMemberModal open={inviteOpen} onOpenChange={setInviteOpen} onInvited={loadMembers} />

      {/* Remove confirmation */}
      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The member will lose access to the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} variant="destructive">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}