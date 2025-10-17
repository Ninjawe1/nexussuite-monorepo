// Use Firestore storage adapter exclusively to avoid importing Postgres at runtime
import type { IStorage } from "./storage";
import { storage as firebaseStorage } from "./storage-firestore";

export const storage: IStorage = firebaseStorage;