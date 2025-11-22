import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore as adminGetFirestore, Firestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin/app";
import { isSupabaseEnabled } from "./db/supabase";

function parseServiceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const str = json.includes("base64:") ? Buffer.from(json.replace("base64:", ""), "base64").toString("utf-8") : json;
    const parsed = JSON.parse(str);
    if (parsed.private_key && typeof parsed.private_key === "string") parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed as ServiceAccount;
  } catch {
    return null;
  }
}

function buildServiceAccountFromEnv(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") } as ServiceAccount;
}

function ensureFirebaseInitialized(): void {
  const disabled = String(process.env.FIREBASE_DISABLED || '').toLowerCase() === 'true' || isSupabaseEnabled();
  if (disabled) {
    console.warn('Firebase is disabled');
    return;
  }
  try {
    require("firebase-admin/app").getApp();
    return;
  } catch {}
  let sa: ServiceAccount | null = parseServiceAccount();
  if (!sa) sa = buildServiceAccountFromEnv();
  const useADC = !sa;
  const config = useADC ? { credential: applicationDefault() } : { credential: cert(sa as ServiceAccount) };
  initializeApp(config);
}

let firestoreInstance: Firestore | null = null;

export const getFirestore = (): Firestore => {
  const disabled = String(process.env.FIREBASE_DISABLED || '').toLowerCase() === 'true' || isSupabaseEnabled();
  if (disabled) {
    throw new Error('Firebase is disabled');
  }
  if (!firestoreInstance) {
    ensureFirebaseInitialized();
    firestoreInstance = adminGetFirestore();
  }
  return firestoreInstance;
};
