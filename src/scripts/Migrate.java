import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonElement;
import com.google.gson.JsonArray;

import java.io.FileInputStream;
import java.io.FileReader;
import java.util.Map;

public class Migrate {
    public static void main(String[] args) {
        try {
            // Initialize Firebase with service account
            FileInputStream serviceAccount = new FileInputStream(
                "d:\\Nexus suite database\\NexusSuite Main\\src\\scripts\\esports-app-44b10-firebase-adminsdk-fbsvc-249cba7525.json"
            );

            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            FirebaseApp.initializeApp(options);
            Firestore db = FirestoreClient.getFirestore();

            // Read the JSON data file
            String jsonPath = "d:\\Nexus suite database\\nexus-database-export-2025-10-14.json";
            JsonObject root = new Gson().fromJson(new FileReader(jsonPath), JsonObject.class);

            // Get the "data" object
            JsonObject data = root.getAsJsonObject("data");
            if (data == null) {
                System.err.println("No 'data' field found in JSON.");
                System.exit(1);
            }

            // Iterate through collections
            for (Map.Entry<String, JsonElement> entry : data.entrySet()) {
                String collectionName = entry.getKey();
                JsonArray documents = entry.getValue().getAsJsonArray();

                System.out.println("Migrating collection: " + collectionName);
                WriteBatch batch = db.batch();

                for (JsonElement doc : documents) {
                    JsonObject docObj = doc.getAsJsonObject();
                    String docId = docObj.has("id") ? docObj.get("id").getAsString() : null;
                    if (docId != null) {
                        batch.set(db.collection(collectionName).document(docId), docObj);
                    } else {
                        batch.set(db.collection(collectionName).document(), docObj);
                    }
                }

                batch.commit().get();
                System.out.println("Successfully migrated " + documents.size() + " documents to " + collectionName + " collection.");
            }

            System.out.println("\nData migration completed successfully!");
            System.exit(0);

        } catch (Exception e) {
            System.err.println("Error during migration: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}