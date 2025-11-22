import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "NexusSuite/.env") });

import { getFirestore } from "../../auth/firebase";

async function main() {
  const db = getFirestore();
  const collections = await (db as any).listCollections();
  const report: Record<string, number> = {};
  for (const col of collections) {
    const snap = await col.get();
    report[col.id] = snap.size;
  }
  console.log(JSON.stringify({ success: true, firestore: report }));
}

main().catch((e) => {
  console.error(JSON.stringify({ success: false, error: String(e?.message || e) }));
  process.exit(1);
});