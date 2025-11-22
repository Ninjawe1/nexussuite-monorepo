/**
 * Migration: Map legacy roles (manager, staff, player, analyst) to new four-role structure (owner, admin, finance, marcom)
 *
 * - Keeps existing roles (owner, admin, finance, marcom) as-is
 * - Maps manager -> admin
 * - Maps staff/player/analyst -> marcom
 * - Leaves missing/unknown roles untouched unless --default-missing is passed (then sets to marcom)
 *
 * Usage:
 *   node server/scripts/migrate-roles.js             # migrate roles
 *   node server/scripts/migrate-roles.js --dry-run   # print what would change without writing
 *   node server/scripts/migrate-roles.js --default-missing  # also set missing roles to marcom
 */

import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function resolveProjectId(json) {
  return (
    (json && json.project_id) ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT
  );
}

function initFirebase() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const jsonStr = Buffer.from(b64, "base64").toString("utf8");
      const json = JSON.parse(jsonStr);
      if (json && typeof json.private_key === "string") {
        json.private_key = json.private_key.replace(/\\n/g, "\n");
      }
      const projectId = resolveProjectId(json) || "esports-app-44b10";
      console.log("Firebase init: using FIREBASE_SERVICE_ACCOUNT_B64; projectId", projectId);
      return initializeApp({ credential: cert(json), projectId });
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_B64:", e);
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    console.log("Firebase init: using FIREBASE_SERVICE_ACCOUNT_JSON (length)", jsonStr.length);
    let json = null;
    try {
      json = JSON.parse(jsonStr);
      if (json && typeof json.private_key === "string") {
        json.private_key = json.private_key.replace(/\\n/g, "\n");
      }
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
    const projectId = resolveProjectId(json) || "esports-app-44b10";
    console.log("Firebase init: resolved projectId", projectId);
    return initializeApp({ credential: cert(json), projectId });
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    console.log("Firebase init: using GOOGLE_APPLICATION_CREDENTIALS file", keyPath);
    const content = fs.readFileSync(keyPath, "utf8");
    let json = null;
    try {
      json = JSON.parse(content);
      if (json && typeof json.private_key === "string") {
        json.private_key = json.private_key.replace(/\\n/g, "\n");
      }
    } catch (e) {
      console.error("Invalid GOOGLE_APPLICATION_CREDENTIALS file JSON:", e);
    }
    const projectId = resolveProjectId(json) || "esports-app-44b10";
    console.log("Firebase init: resolved projectId from file", projectId);
    return initializeApp({ credential: cert(json), projectId });
  }

  const projectId = resolveProjectId() || "esports-app-44b10";
  if (process.env.FIREBASE_ALLOW_ADC === "true") {
    console.warn("Firebase init: using applicationDefault credentials; projectId:", projectId);
    return initializeApp({ credential: applicationDefault(), projectId });
  }
  throw new Error("Firebase credentials not provided. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_B64.");
}

function mapRole(role) {
  if (!role) return undefined;
  switch (role) {
    case "owner":
    case "admin":
    case "finance":
    case "marcom":
      return role; // already new structure
    case "manager":
      return "admin";
    case "staff":
    case "player":
    case "analyst":
      return "marcom";
    default:
      return undefined; // unknown legacy, leave as-is unless --default-missing
  }
}

async function run() {
  const app = initFirebase();
  const db = getFirestore(app);
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const defaultMissing = args.includes("--default-missing");

  console.log(`Starting role migration (dryRun=${dryRun}, defaultMissing=${defaultMissing})...`);

  const orgsSnap = await db.collection("organizations").get();
  console.log(`Found ${orgsSnap.size} organizations`);

  let totalMembers = 0;
  let updatedCount = 0;
  let defaultedMissingCount = 0;

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const membersRef = db.collection(`organizations/${orgId}/members`);
    const membersSnap = await membersRef.get();
    totalMembers += membersSnap.size;

    const batch = db.batch();
    let writesInBatch = 0;

    membersSnap.forEach((doc) => {
      const data = doc.data();
      const oldRole = data.role;
      const newRole = mapRole(oldRole);
      if (newRole && newRole !== oldRole) {
        updatedCount++;
        console.log(`[${orgId}] ${doc.id}: ${oldRole} -> ${newRole}`);
        if (!dryRun) {
          batch.set(doc.ref, { role: newRole, updatedAt: new Date() }, { merge: true });
          writesInBatch++;
        }
      } else if (!oldRole && defaultMissing) {
        defaultedMissingCount++;
        console.log(`[${orgId}] ${doc.id}: (missing) -> marcom`);
        if (!dryRun) {
          batch.set(doc.ref, { role: "marcom", updatedAt: new Date() }, { merge: true });
          writesInBatch++;
        }
      }
    });

    if (!dryRun && writesInBatch > 0) {
      await batch.commit();
      console.log(`[${orgId}] Committed ${writesInBatch} updates`);
    }
  }

  console.log(`Migration complete. Total members scanned: ${totalMembers}`);
  console.log(`Updated legacy roles: ${updatedCount}`);
  if (defaultMissing) console.log(`Defaulted missing roles to marcom: ${defaultedMissingCount}`);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});