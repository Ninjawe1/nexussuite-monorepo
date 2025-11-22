import admin from "firebase-admin";

admin.initializeApp(); // uses your serviceAccount.json or env vars
const db = admin.firestore();

(async () => {
  const usersSnap = await db.collection("users").get();

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.hashedPassword && !data.password) {
      await doc.ref.update({
        password: data.hashedPassword,
      });
      console.log(`✅ Migrated: ${doc.id}`);
    }
  }

  console.log("Migration complete!");
  process.exit(0);
})();
