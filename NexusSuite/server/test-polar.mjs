import { Polar } from "@polar-sh/sdk";
// Env should be provided externally; no local dotenv.config calls here

const token = process.env.POLAR_ACCESS_TOKEN;
const serverEnv = String(process.env.POLAR_SERVER || "sandbox").toLowerCase();
const server = serverEnv === "production" ? "production" : "sandbox";

if (!token) {
  console.error("❌ Missing POLAR_ACCESS_TOKEN in .env");
  process.exit(1);
}

console.log("🔧 Using Polar server:", server);
console.log("🔑 Using token (first 8 chars):", token.slice(0, 8));

const polar = new Polar({
  accessToken: token,
  server,
});

(async () => {
  console.log("Testing Polar connection...");
  try {
    const products = await polar.products.list({ active: true });
    console.log("✅ Connected to Polar! Products page:", products);

    const externalId = process.env.TEST_ORG_ID || "org_dev_test_001";
    const email = process.env.TEST_EMAIL || "dev@example.com";

    let customer = null;
    try {
      customer = await polar.customers.getExternal({ externalId });
      console.log("Found existing customer:", customer?.id || customer);
    } catch (e) {
      console.log("No existing customer; creating new");
      customer = await polar.customers.create({ externalId, email, name: "Dev Tester" });
      console.log("Created customer:", customer?.id || customer);
    }

    const session = await polar.customerSessions.create({
      customerId: String(customer?.id || customer?.customer?.id || ""),
      returnUrl: "http://localhost:5173/dashboard/org/billing",
    });
    console.log("Customer Portal URL:", session?.customerPortalUrl);
  } catch (err) {
    console.error("❌ Polar error:", err.message || err);
  }
})();
