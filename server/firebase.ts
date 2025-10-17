import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

function initFirebase() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    return initializeApp({ credential: cert(json as any) });
  }

  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    const json = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    return initializeApp({ credential: cert(json as any) });
  }

  return initializeApp({ credential: applicationDefault() });
}

const app = initFirebase();
export const firestore = getFirestore(app);