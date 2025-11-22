/**
 * Firebase Admin SDK initialization for Better Auth integration
 * Supports multiple credential formats for production flexibility
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore as adminGetFirestore, Firestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin/app';
import { isSupabaseEnabled } from "../db/supabase";
// Env is loaded centrally in server/index.ts; no local dotenv.config calls here

/**
 * Parse service account from environment variables
 * Supports both base64 encoded JSON and raw JSON string
 */
function parseServiceAccount(): ServiceAccount | null {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    return null;
  }

  try {
    // Try to parse as base64 first
    if (serviceAccountJson.includes('base64:')) {
      const base64Data = serviceAccountJson.replace('base64:', '');
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return fixPrivateKey(parsed);
    }
    
    // Try to parse as raw JSON
    const parsed = JSON.parse(serviceAccountJson);
    return fixPrivateKey(parsed);
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error);
    return null;
  }
}

/**
 * Fix private key formatting (replace \n with actual newlines)
 */
function fixPrivateKey(serviceAccount: any): ServiceAccount {
  if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  return serviceAccount as ServiceAccount;
}

/**
 * Build service account from individual environment variables
 */
function buildServiceAccountFromEnv(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

/**
 * Initialize Firebase Admin SDK with fallback strategies
 */
function initializeFirebaseAdmin(): void {
  const disabled = String(process.env.FIREBASE_DISABLED || '').toLowerCase() === 'true' || isSupabaseEnabled();
  if (disabled) {
    console.warn('Firebase is disabled');
    return;
  }
  // Check if already initialized
  try {
    const existingApp = require('firebase-admin/app').getApp();
    console.log('Firebase Admin SDK already initialized');
    return;
  } catch {
    // Not initialized yet, continue with initialization
  }

  let serviceAccount: ServiceAccount | null = null;
  let usingADC = false;

  // Strategy 1: Try service account JSON (base64 or raw)
  serviceAccount = parseServiceAccount();
  
  // Strategy 2: Try individual environment variables
  if (!serviceAccount) {
    serviceAccount = buildServiceAccountFromEnv();
  }

  // Strategy 3: Try Application Default Credentials (ADC)
  if (!serviceAccount) {
    // Prefer ADC fallback when explicit envs are not present
    usingADC = true;
    console.warn('Firebase credentials not found in env; falling back to Application Default Credentials (ADC).');
  }

  try {
    const config = usingADC 
      ? { credential: applicationDefault() }
      : { credential: cert(serviceAccount!) };

    initializeApp(config);
    console.log('Firebase Admin SDK initialized successfully');
    
    if (serviceAccount && !usingADC) {
      console.log(`Firebase project: ${serviceAccount.projectId}`);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Get Firestore instance (singleton pattern)
 */
let firestoreInstance: Firestore | null = null;

export function getFirestore(): Firestore {
  const disabled = String(process.env.FIREBASE_DISABLED || '').toLowerCase() === 'true' || isSupabaseEnabled();
  if (disabled) {
    throw new Error('Firebase is disabled');
  }
  if (!firestoreInstance) {
    try {
      require('firebase-admin/app').getApp();
    } catch {
      initializeFirebaseAdmin();
    }
    firestoreInstance = adminGetFirestore();
  }
  return firestoreInstance;
}

/**
 * Export Firestore for direct use
 */
export const db: any = (() => {
  const disabled = String(process.env.FIREBASE_DISABLED || '').toLowerCase() === 'true' || isSupabaseEnabled();
  if (disabled) {
    return new Proxy({}, { get() { throw new Error('Firebase is disabled'); } });
  }
  return getFirestore();
})();

export type { Firestore } from 'firebase-admin/firestore';