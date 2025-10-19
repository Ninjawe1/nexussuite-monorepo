// Module: firebase.ts imports
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function resolveProjectId(json?: any): string | undefined {
  return (
    (json && json.project_id) ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT
  );
}

// Module: firebase.ts initFirebase()
function initFirebase() {
  // Base64 alias fallback: FIREBASE_SERVICE_ACCOUNT_B64
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const jsonStr = Buffer.from(b64, "base64").toString("utf8");
      const json = JSON.parse(jsonStr);
      // Normalize private_key newlines in case they are stored with escaped \n in env
      if (json && typeof (json as any).private_key === "string") {
        (json as any).private_key = (json as any).private_key.replace(/\\n/g, "\n");
      }
      const projectId = resolveProjectId(json) || "esports-app-44b10";
      console.log("Firebase init: using FIREBASE_SERVICE_ACCOUNT_B64; projectId", projectId);
      return initializeApp({ credential: cert(json as any), projectId });
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_B64:", e);
    }
  }

  // Prefer explicit service account JSON from env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    console.log("Firebase init: using FIREBASE_SERVICE_ACCOUNT_JSON (length)", jsonStr.length);
    let json: any = null;
    try {
      json = JSON.parse(jsonStr);
      // Normalize private_key newlines in case they are stored with escaped \n in env
      if (json && typeof json.private_key === "string") {
        json.private_key = json.private_key.replace(/\\n/g, "\n");
      }
    } catch (e) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
    const projectId = resolveProjectId(json) || "esports-app-44b10";
    console.log("Firebase init: resolved projectId", projectId);
    return initializeApp({ credential: cert(json as any), projectId });
  }

  // Fallback to GOOGLE_APPLICATION_CREDENTIALS file if provided
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    console.log("Firebase init: using GOOGLE_APPLICATION_CREDENTIALS file", keyPath);
    const content = fs.readFileSync(keyPath, "utf8");
    let json: any = null;
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
    return initializeApp({ credential: cert(json as any), projectId });
  }

  // Bundled file fallbacks (via included_files in netlify.toml)
  const candidatePaths = [
    path.resolve(process.cwd(), "firebase-json-import/esports-app-44b10-firebase-adminsdk-fbsvc-249cba7525.json"),
    path.resolve(process.cwd(), "src/scripts/esports-app-44b10-firebase-adminsdk-fbsvc-249cba7525.json"),
    path.resolve(__dirname, "../../firebase-json-import/esports-app-44b10-firebase-adminsdk-fbsvc-249cba7525.json"),
    path.resolve(__dirname, "../../src/scripts/esports-app-44b10-firebase-adminsdk-fbsvc-249cba7525.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        console.log("Firebase init: using bundled service account file:", p);
        const content = fs.readFileSync(p, "utf8");
        const json = JSON.parse(content);
        if (json && typeof (json as any).private_key === "string") {
          (json as any).private_key = (json as any).private_key.replace(/\\n/g, "\n");
        }
        const projectId = resolveProjectId(json) || "esports-app-44b10";
        console.log("Firebase init: resolved projectId from bundled file", projectId);
        return initializeApp({ credential: cert(json as any), projectId });
      } catch (e) {
        console.error("Failed reading bundled service account file", p, e);
      }
    }
  }

  // Final fallback to application default credentials + hard-coded projectId
  const projectId = resolveProjectId() || "esports-app-44b10";
  console.warn("Firebase init: using applicationDefault credentials; projectId:", projectId);
  return initializeApp({ credential: applicationDefault(), projectId });
}

const app = initFirebase();
export const firestore = getFirestore(app);