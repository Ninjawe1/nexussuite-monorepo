export type TeamRole =
  | "Captain"
  | "Coach"
  | "Player"
  | "Analyst"
  | "Manager"
  | "Substitute";

export interface RoleOption {
  value: TeamRole;
  label: string;
}

// Canonical team roles used across Assign Player and Edit Player dialogs
export const TEAM_ROLES: RoleOption[] = [
  { value: "Captain", label: "Captain" },
  { value: "Coach", label: "Coach" },
  { value: "Player", label: "Player" },
  { value: "Analyst", label: "Analyst" },
  { value: "Manager", label: "Manager" },
  { value: "Substitute", label: "Substitute" },
];

// Helper to ensure consistent badge text
export function formatRoleBadge(role: string | undefined): string {
  if (!role) return "";
  const match = TEAM_ROLES.find(
    (r) =>
      r.value.toLowerCase() === role.toLowerCase() ||
      r.label.toLowerCase() === role.toLowerCase(),
  );
  return match ? match.label : role;
}
