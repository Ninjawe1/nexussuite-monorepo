// SQLite database instance for Better Auth (dedicated auth DB)
// Uses better-sqlite3 for synchronous, safe Node.js access
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

// NOTE: Keep auth.sqlite out of version control for local dev; configure proper path in production
const sqlitePath = process.env.AUTH_SQLITE_PATH || 
  `${process.cwd()}/server/auth/auth.sqlite`;

// Type as any to avoid TS4023 named type issue in some TS configs
export const sqlite: any = new Database(sqlitePath);
export const authDb = drizzle(sqlite);

// If you prefer to share a single DB, you can point to an existing SQLite file, but
// keeping auth data isolated is often cleaner and helps with migrations.
// For Drizzle schema, Better Auth CLI can generate tables automatically.
// See: npx @better-auth/cli generate && npx drizzle-kit migrate