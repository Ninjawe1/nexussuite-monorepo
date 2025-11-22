import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAxieQgkig2qZxhn7qMFzc8V0ccMEdm4no",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "esports-app-44b10.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "esports-app-44b10",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "esports-app-44b10.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);

// Prefer persistent cache where available; fallback to memory in restricted envs
const usePersistence = typeof window !== 'undefined' && ('indexedDB' in window);

// Only force long polling when explicitly enabled via env; otherwise use auto-detect
const forceLongPolling = (import.meta.env.VITE_FIRESTORE_FORCE_LONG_POLLING === 'true');

export const db = initializeFirestore(app, {
  localCache: usePersistence
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache(),
  ...(forceLongPolling
    ? { experimentalForceLongPolling: true }
    : { experimentalAutoDetectLongPolling: true })
});

export const auth = getAuth(app);
export const functions = getFunctions(app);

// Connect to emulators only when explicitly enabled via VITE_FIREBASE_USE_EMULATORS
const useEmulators = String(import.meta.env.VITE_FIREBASE_USE_EMULATORS || '').toLowerCase() === 'true';
if (useEmulators) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    console.warn('Failed to connect to Firebase emulators:', error);
  }
}

