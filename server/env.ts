import * as path from "path";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../NexusSuite/.env");
dotenv.config({ path: envPath });
console.log("🔑 Environment file loaded from:", envPath);

// Lightweight runtime validation (no external dependencies)
(() => {
  const required = [
    // Auth
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    // JWT
    "JWT_SECRET",
    // Supabase
    "SUPABASE_URL",
    // Either service key or anon key must exist for read operations; service is preferred for server
    "SUPABASE_SERVICE_KEY",
    // Client/Vite
    "VITE_APP_URL",
    "VITE_API_URL",
  ];
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
  if (missing.length) {
    console.warn("⚠️  Missing environment variables:", missing.join(", "));
    console.warn("Ensure NexusSuite/.env is configured correctly. Server will continue, but features may be limited.");
  }
  const polarEnabled = String(process.env.POLAR_ENABLED || "").toLowerCase() === "true" || !!process.env.POLAR_ACCESS_TOKEN;
  if (!polarEnabled) {
    console.warn("ℹ️  Polar billing disabled (POLAR_ENABLED not true or no POLAR_ACCESS_TOKEN)");
  }
})();

