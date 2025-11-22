import { getFirestoreDb } from "./firebase";

export type OrgRole = "owner" | "admin" | "finance" | "marcom";

const MEMBERS_COLLECTION = (orgId: string) => `organizations/${orgId}/members`;

export async function getMemberRole(orgId: string, userId: string): Promise<OrgRole | undefined> {
  const db = getFirestoreDb();
  const ref = db.collection(MEMBERS_COLLECTION(orgId)).doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return undefined;
  const data = snap.data() as any;
  return (data?.role as OrgRole) || undefined;
}

export async function setMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
  const db = getFirestoreDb();
  const ref = db.collection(MEMBERS_COLLECTION(orgId)).doc(userId);
  await ref.set(
    {
      role,
      updatedAt: new Date(),
      joinedAt: new Date(),
    },
    { merge: true },
  );
}

export interface MemberMetadata {
  email?: string;
  name?: string;
  // TODO: Remove Clerk-specific fields after migration
  // clerkRole?: string;
  // lastSyncedAt?: Date;
  // syncSource?: string;
}

export async function setMemberRoleWithMetadata(
  orgId: string, 
  userId: string, 
  role: OrgRole, 
  metadata: MemberMetadata = {}
): Promise<void> {
  const db = getFirestoreDb();
  const ref = db.collection(MEMBERS_COLLECTION(orgId)).doc(userId);
  
  // Get existing data to preserve joinedAt if it exists
  const existingDoc = await ref.get();
  const existingData = existingDoc.exists ? existingDoc.data() : {};
  
  await ref.set(
    {
      role,
      updatedAt: new Date(),
      joinedAt: existingData?.joinedAt || new Date(),
      ...metadata,
    },
    { merge: true },
  );
}

export async function removeMemberFromOrg(orgId: string, userId: string): Promise<void> {
  const db = getFirestoreDb();
  const ref = db.collection(MEMBERS_COLLECTION(orgId)).doc(userId);
  await ref.delete();
}

export async function isOwnerOrAdmin(orgId: string, userId: string): Promise<boolean> {
  const role = await getMemberRole(orgId, userId);
  return role === "owner" || role === "admin";
}

export const ROLE_PERMISSIONS: Record<OrgRole, string[]> = {
  owner: [
    "manage:staff",
    "manage:payroll",
    "manage:tournaments",
    "manage:matches",
    "manage:campaigns",
    "manage:contracts",
    "manage:invites",
    "manage:finance",
    "manage:social",
    "manage:users",
    "manage:files",
    "manage:roles",
  ],
  admin: [
    "manage:staff",
    "manage:payroll",
    "manage:tournaments",
    "manage:matches",
    "manage:campaigns",
    "manage:contracts",
    "manage:invites",
    "manage:finance",
    "manage:social",
    "manage:users",
    "manage:files",
    "manage:roles",
  ],
  finance: ["manage:finance", "manage:payroll"],
  marcom: ["manage:campaigns", "manage:social"],
};

export async function hasPermission(orgId: string, userId: string, permission: string): Promise<boolean> {
  const role = await getMemberRole(orgId, userId);
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

// Helper type for listing members in an organization (for Team page / admin UI)
export interface OrgMember {
  userId: string;
  role?: OrgRole;
  email?: string;
  name?: string;
  joinedAt?: Date;
  updatedAt?: Date;
  // TODO: Remove Clerk-specific fields after migration
  // clerkRole?: string;
  // lastSyncedAt?: Date;
  // syncSource?: string;
}

// List all members of an organization with basic metadata
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const db = getFirestoreDb();
  const ref = db.collection(MEMBERS_COLLECTION(orgId));
  const snap = await ref.get();
  return snap.docs.map((doc) => {
    const data = doc.data() as any;
    const member: OrgMember = {
      userId: doc.id,
      role: data?.role as OrgRole | undefined,
      email: data?.email,
      name: data?.name,
      joinedAt: data?.joinedAt,
      updatedAt: data?.updatedAt,
      // TODO: Remove Clerk-specific fields after migration
      // clerkRole: data?.clerkRole,
      // lastSyncedAt: data?.lastSyncedAt,
      // syncSource: data?.syncSource,
    };
    return member;
  });
}

