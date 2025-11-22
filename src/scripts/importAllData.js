// importAllData.js

const admin = require('firebase-admin');
const fs = require('fs'); // Node.js File System module
const get = require('lodash.get'); // Helper for safely accessing nested JSON paths

// --- IMPORTANT: CONFIGURE THESE PATHS & DATA MAPPINGS ---

// 1. Path to your Firebase Admin SDK service account key
const serviceAccountPath = './esports-app-44b10-firebase-adminsdk-fbsvc-249cba7525.json'; // <<-- UPDATE FILENAME

// 2. Path to your downloaded FULL JSON data file from Replit
const pathToReplitData = './replit_full_database.json'; // <<-- UPDATE FILENAME

// 3. Define the mappings from your JSON paths to Firestore collections
//    Add an entry for each "table" (array of objects) in your JSON.
const COLLECTION_MAPS = [
  {
    jsonPath: 'data.tenants',      // The path to the array within your JSON file
    firestoreCollection: 'tenants', // The name of the Firestore collection to create/update
    idField: 'id'                  // (Optional) The field in each object to use as the Firestore Document ID. If omitted, Firestore generates one.
  },
  {
    jsonPath: 'data.users',
    firestoreCollection: 'users',
    idField: 'id' // Assuming your user objects also have an 'id' field
  },
  {
    jsonPath: 'data.staff',
    firestoreCollection: 'staff',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  {
    jsonPath: 'data.payroll',
    firestoreCollection: 'payroll',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  {
    jsonPath: 'data.matches',
    firestoreCollection: 'matches',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  {
    jsonPath: 'data.campaigns',
    firestoreCollection: 'campaigns',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  {
    jsonPath: 'data.contracts',
    firestoreCollection: 'contracts',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  {
    jsonPath: 'data.auditLogs',
    firestoreCollection: 'auditLogs',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  {
    jsonPath: 'data.invites',
    firestoreCollection: 'invites',
    idField: 'id' // Assuming staff objects also have an 'id' field
  },
  // Add more entries here for any other collections you have:
  // {
  //   jsonPath: 'data.products',
  //   firestoreCollection: 'products',
  //   idField: 'productId' // Example for a different idField name
  // },
  // {
  //   jsonPath: 'data.gameSessions',
  //   firestoreCollection: 'gameSessions',
  //   // No idField specified, Firestore will auto-generate document IDs
  // },
];

// --------------------------------------------------------

// Initialize Firebase Admin SDK
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error(`Error initializing Firebase Admin SDK. Make sure your service account key path is correct: ${serviceAccountPath}`, error);
  process.exit(1); // Exit if initialization fails
}

const db = admin.firestore();

// Helper function to convert ISO date strings to Firestore Timestamps (JavaScript Date objects)
function convertDateStringsToDates(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Check if it's an ISO 8601 date string
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(obj[key])) { // Made regex more robust
          obj[key] = new Date(obj[key]);
        }
      } else if (typeof obj[key] === 'object') {
        // Recursively check nested objects and arrays
        convertDateStringsToDates(obj[key]);
      }
    }
  }
  return obj;
}

// Main import function
async function importAllData() {
  let replitRawData;
  try {
    replitRawData = JSON.parse(fs.readFileSync(pathToReplitData, 'utf8'));
    console.log(`Successfully loaded data from ${pathToReplitData}`);
  } catch (error) {
    console.error(`Error reading or parsing Replit data file: ${pathToReplitData}`, error);
    process.exit(1);
  }

  // Batch writes for efficiency and to respect Firestore limits (max 500 operations per batch)
  const BATCH_SIZE = 499; // Slightly less than 500 for safety

  for (const mapping of COLLECTION_MAPS) {
    const { jsonPath, firestoreCollection, idField } = mapping;
    console.log(`\n--- Processing '${jsonPath}' into Firestore collection '${firestoreCollection}' ---`);

    // Use lodash.get to safely access deeply nested data
    const dataToImport = get(replitRawData, jsonPath);

    if (!Array.isArray(dataToImport)) {
      console.warn(`Path '${jsonPath}' in your JSON is not an array or does not exist. Skipping this collection.`);
      continue;
    }

    if (dataToImport.length === 0) {
      console.log(`No items found for '${jsonPath}'. Skipping this collection.`);
      continue;
    }

    let batch = db.batch();
    let itemsProcessed = 0;
    let batchCount = 0;

    for (const item of dataToImport) {
      // Create a deep copy to avoid modifying the original 'item' in 'dataToImport'
      const itemDataForFirestore = JSON.parse(JSON.stringify(item));

      // Convert date strings to Date objects for Firestore Timestamps
      convertDateStringsToDates(itemDataForFirestore);

      let documentId = null;
      if (idField && itemDataForFirestore[idField]) {
        documentId = String(itemDataForFirestore[idField]); // Ensure ID is a string
        delete itemDataForFirestore[idField]; // Remove the ID field from the document's data
      }

      const targetDocRef = documentId ? db.collection(firestoreCollection).doc(documentId) : db.collection(firestoreCollection).doc();
      batch.set(targetDocRef, itemDataForFirestore);
      itemsProcessed++;

      if (itemsProcessed % BATCH_SIZE === 0) {
        batchCount++;
        console.log(`  Committing batch #${batchCount} for '${firestoreCollection}' (${itemsProcessed} items so far)...`);
        await batch.commit();
        batch = db.batch(); // Start a new batch
      }
    }

    // Commit any remaining documents in the last batch
    if (itemsProcessed > 0 && itemsProcessed % BATCH_SIZE !== 0) {
      batchCount++;
      console.log(`  Committing final batch #${batchCount} for '${firestoreCollection}' (${itemsProcessed} items total)...`);
      await batch.commit();
    } else if (itemsProcessed === 0) {
        console.log(`  No items were successfully processed for '${firestoreCollection}'.`);
    }

    console.log(`🎉 Successfully imported ${itemsProcessed} items into Firestore collection '${firestoreCollection}'!`);
  }

  console.log("\n--- All specified collections processed. ---");
  process.exit(0); // Exit successfully
}

// Run the import function
importAllData().catch((error) => {
  console.error("An error occurred during import:", error);
  process.exit(1); // Exit with error code
});
