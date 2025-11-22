import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RoleSelectDropdown from "@/components/RoleSelectDropdown";
import { useOrganization } from "@/contexts/OrganizationContext";

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

export function InviteMemberModal({ open, onOpenChange, onInvited }: InviteMemberModalProps) {
  const { inviteMember } = useOrganization();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!email) return;
    try {
      setIsSubmitting(true);
      await inviteMember(email, role, name || undefined);
      onOpenChange(false);
      setName("");
      setEmail("");
      setRole("admin");
      onInvited?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite new member</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the user email and select a role. Only Org Owner can assign the Owner role.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="invite-name">Name</label>
            <Input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="invite-email">Email</label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="invite-role">Role</label>
            <RoleSelectDropdown value={role} onChange={setRole} className="w-[220px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isSubmitting || !email}>
            {isSubmitting ? "Inviting..." : "Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteMemberModal;