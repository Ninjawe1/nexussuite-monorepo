import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - Custom authentication with tenant support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: text("password").notNull(), // Hashed password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  tenantId: varchar("tenant_id"), // Multi-tenant support (nullable for super admins)
  role: varchar("role").notNull().default("owner"), // owner, admin, manager, staff, player, marcom, analyst, finance
  isSuperAdmin: boolean("is_super_admin").notNull().default(false), // System-level admin
  isTemporaryPassword: boolean("is_temporary_password").notNull().default(false), // Must change on first login
  lastPasswordChange: timestamp("last_password_change"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Tenants table - Each esports club is a tenant
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  clubTag: varchar("club_tag"),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color").default("#a855f7"),
  website: varchar("website"),
  region: varchar("region"),
  // Subscription fields
  subscriptionPlan: varchar("subscription_plan").default("starter"), // starter, growth, enterprise
  subscriptionStatus: varchar("subscription_status").default("active"), // active, suspended, canceled, trial
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  // Suspension tracking
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  suspendedBy: varchar("suspended_by"), // User ID who suspended the tenant
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Staff members (players, managers, analysts, etc.)
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  role: varchar("role").notNull(), // owner, admin, manager, staff, player, marcom, analyst, finance
  avatar: varchar("avatar"),
  permissions: jsonb("permissions").notNull().$type<string[]>(),
  status: varchar("status").notNull().default("active"), // active, suspended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

// Payroll entries
export const payroll = pgTable("payroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  staffId: varchar("staff_id"),
  name: varchar("name").notNull(),
  role: varchar("role").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: varchar("type").notNull(), // monthly, weekly, one-time
  status: varchar("status").notNull().default("pending"), // paid, pending
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.union([z.date(), z.string().transform(val => new Date(val))]),
});
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Payroll = typeof payroll.$inferSelect;

// Tournaments (parent structure)
export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: varchar("name").notNull(),
  game: varchar("game").notNull(),
  format: varchar("format").notNull(), // single_elimination, double_elimination, round_robin, league, custom
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }),
  status: varchar("status").notNull().default("upcoming"), // upcoming, ongoing, completed, cancelled
  description: text("description"),
  rules: text("rules"),
  maxTeams: integer("max_teams"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform(val => new Date(val))]),
  endDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
});
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

// Tournament Rounds/Stages (middle layer for brackets/groups)
export const tournamentRounds = pgTable("tournament_rounds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  name: varchar("name").notNull(), // e.g., "Group A", "Quarterfinals", "Semifinals", "Finals"
  roundNumber: integer("round_number").notNull(), // 1, 2, 3, etc. for ordering
  format: varchar("format"), // bracket, group, best_of_3, best_of_5
  startDate: timestamp("start_date"),
  status: varchar("status").notNull().default("upcoming"), // upcoming, ongoing, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTournamentRoundSchema = createInsertSchema(tournamentRounds).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
});
export type InsertTournamentRound = z.infer<typeof insertTournamentRoundSchema>;
export type TournamentRound = typeof tournamentRounds.$inferSelect;

// Matches (updated to reference tournament and round)
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  tournamentId: varchar("tournament_id"), // Reference to tournament (null for standalone matches)
  roundId: varchar("round_id"), // Reference to round (optional)
  teamA: varchar("team_a").notNull(),
  teamB: varchar("team_b").notNull(),
  scoreA: integer("score_a"),
  scoreB: integer("score_b"),
  date: timestamp("date").notNull(),
  tournament: varchar("tournament"), // Legacy field, kept for backward compatibility
  game: varchar("game").notNull(),
  venue: varchar("venue"),
  matchNumber: integer("match_number"), // For ordering within a round
  nextMatchId: varchar("next_match_id"), // For bracket progression (winner goes to this match)
  status: varchar("status").notNull().default("upcoming"), // upcoming, live, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.union([z.date(), z.string().transform(val => new Date(val))]),
});
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// Marketing campaigns
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  platforms: jsonb("platforms").notNull().$type<string[]>(),
  reach: integer("reach"),
  engagement: decimal("engagement", { precision: 5, scale: 2 }),
  status: varchar("status").notNull().default("scheduled"), // active, completed, scheduled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform(val => new Date(val))]),
  endDate: z.union([z.date(), z.string().transform(val => new Date(val))]),
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Contracts
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  fileName: varchar("file_name").notNull(),
  fileUrl: varchar("file_url").notNull(),
  type: varchar("type").notNull(), // Player, Staff, Sponsor
  linkedPerson: varchar("linked_person").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  status: varchar("status").notNull().default("active"), // active, expiring, expired
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expirationDate: z.union([z.date(), z.string().transform(val => new Date(val))]),
});
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name").notNull(),
  action: text("action").notNull(),
  entity: varchar("entity").notNull(),
  entityId: varchar("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  actionType: varchar("action_type").notNull(), // create, update, delete
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Social Media Accounts
export const socialAccounts = pgTable("social_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  platform: varchar("platform").notNull(), // facebook, instagram, twitter, tiktok, youtube
  accountName: varchar("account_name").notNull(),
  accountId: varchar("account_id"), // Platform-specific account ID
  apiKey: text("api_key"), // Encrypted API key/access token
  apiSecret: text("api_secret"), // Encrypted API secret if needed
  refreshToken: text("refresh_token"), // For OAuth flows
  expiresAt: timestamp("expires_at"), // Token expiration
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccounts.$inferSelect;

// Social Media Metrics
export const socialMetrics = pgTable("social_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(), // References socialAccounts.id
  tenantId: varchar("tenant_id").notNull(),
  platform: varchar("platform").notNull(),
  followers: integer("followers").default(0),
  following: integer("following").default(0),
  posts: integer("posts").default(0),
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),
  engagement: integer("engagement").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0"),
  profileViews: integer("profile_views").default(0),
  websiteClicks: integer("website_clicks").default(0),
  date: timestamp("date").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSocialMetricSchema = createInsertSchema(socialMetrics).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.union([z.date(), z.string().transform(val => new Date(val))]),
});
export type InsertSocialMetric = z.infer<typeof insertSocialMetricSchema>;
export type SocialMetric = typeof socialMetrics.$inferSelect;

// Staff Invites
export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  email: varchar("email").notNull(),
  role: varchar("role").notNull(),
  permissions: jsonb("permissions").notNull().$type<string[]>(),
  token: varchar("token").notNull().unique(),
  invitedBy: varchar("invited_by").notNull(),
  inviterName: varchar("inviter_name").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, accepted, expired
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true,
  createdAt: true,
});
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;

// Finance Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  type: varchar("type").notNull(), // income, expense
  category: varchar("category").notNull(), // sponsorship, merchandise, tournament_prize, salaries, equipment, facility, travel, etc
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  paymentMethod: varchar("payment_method"), // cash, bank_transfer, credit_card, paypal, etc
  reference: varchar("reference"), // invoice number, receipt number, etc
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.union([z.date(), z.string().transform(val => new Date(val))]),
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
