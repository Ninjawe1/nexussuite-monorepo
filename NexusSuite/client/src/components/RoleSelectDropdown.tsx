import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";


interface RoleSelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string; // allow width/size alignment in forms
}

// Align with server ROLE_PERMISSIONS in orgRoles.ts
const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "finance", label: "Finance" },
  { value: "marcom", label: "Marcom" },
];

export function RoleSelectDropdown({ value, onChange, disabled, className }: RoleSelectDropdownProps) {
  const { currentMembership } = useOrganization();
  const requesterRole = (currentMembership?.role || "").toLowerCase();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className || "w-[180px]"}>
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((opt) => {
          const isOwnerOption = opt.value === "owner";
          const disableOwner = isOwnerOption && requesterRole !== "owner";

          return (
            <SelectItem key={opt.value} value={opt.value} disabled={disableOwner}>
              {opt.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default RoleSelectDropdown;

