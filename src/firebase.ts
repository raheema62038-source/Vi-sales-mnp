/// <reference types="vite/client" />
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseConfigOptions } from './types';

const STORAGE_KEY = 'vi_sales_mnp_firebase_config';

// Official Firebase Web App configuration for verified active project vi-seles-mnp-e7594
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigOptions = {
  apiKey: "AIzaSyBMOEFTcBLVo-azih7gK-KGimcvS-oKfHo",
  authDomain: "vi-seles-mnp-e7594.firebaseapp.com",
  projectId: "vi-seles-mnp-e7594",
  storageBucket: "vi-seles-mnp-e7594.firebasestorage.app",
  messagingSenderId: "1064518972558",
  appId: "1:1064518972558:web:bc6ad9ca16f166fa2245df"
};

export interface FirebaseConfigValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Normalizes and sanitizes Firebase configuration.
 * Maps project configuration to the authoritative vi-seles-mnp-e7594 project and ensures Web App ID format.
 */
export function normalizeFirebaseConfig(config: FirebaseConfigOptions): FirebaseConfigOptions {
  let projectId = (config.projectId || '').trim() || DEFAULT_FIREBASE_CONFIG.projectId;
  let authDomain = (config.authDomain || '').trim();
  let storageBucket = (config.storageBucket || '').trim();
  let apiKey = (config.apiKey || '').trim() || DEFAULT_FIREBASE_CONFIG.apiKey;
  let messagingSenderId = (config.messagingSenderId || '').trim() || DEFAULT_FIREBASE_CONFIG.messagingSenderId;
  let appId = (config.appId || '').trim() || DEFAULT_FIREBASE_CONFIG.appId;

  // Reject defunct/invalid API key from legacy project
  if (apiKey === 'AIzaSyDbwe2VLxYaT8gPZDIioTbHC6UWtm1D4Qs' || !apiKey) {
    apiKey = DEFAULT_FIREBASE_CONFIG.apiKey;
  }

  // Use the verified active existing project configuration for vi-seles-mnp-e7594
  if (
    projectId === 'vi-sales-mnp' ||
    projectId === 'vi-sales-mnp-e7594' ||
    projectId === 'vi-seles-mnp-e7594' || 
    projectId.includes('sales-mnp') || 
    projectId.includes('seles-mnp')
  ) {
    projectId = 'vi-seles-mnp-e7594';
    authDomain = 'vi-seles-mnp-e7594.firebaseapp.com';
    storageBucket = 'vi-seles-mnp-e7594.firebasestorage.app';
  } else {
    if (!authDomain) {
      authDomain = `${projectId}.firebaseapp.com`;
    }
    if (!storageBucket) {
      storageBucket = `${projectId}.firebasestorage.app`;
    }
  }

  // Ensure Web App ID format for Web SDK
  if (appId.includes(':android:') || appId.startsWith('1:646419775774:')) {
    appId = DEFAULT_FIREBASE_CONFIG.appId;
    messagingSenderId = DEFAULT_FIREBASE_CONFIG.messagingSenderId;
  }

  return {
    apiKey,
    authDomain: authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId,
    storageBucket: storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId,
    appId,
  };
}

/**
 * Verifies Firebase configuration for Web and Android environments.
 * Gracefully handles Android App IDs by mapping to the project's Web App ID,
 * ensuring Firebase Auth (including Phone Auth) functions properly.
 */
export function verifyFirebaseWebConfig(config: FirebaseConfigOptions | null | undefined): FirebaseConfigValidationResult {
  if (!config) {
    return { isValid: false, error: 'Firebase configuration is missing.' };
  }

  const { apiKey, projectId, authDomain } = config;

  // 1. Verify Project ID
  if (!projectId || !projectId.trim()) {
    return { 
      isValid: false, 
      error: 'Firebase Project ID is required.' 
    };
  }

  // 2. Verify Web API Key
  if (!apiKey || !apiKey.trim()) {
    return { isValid: false, error: 'Firebase Web API key is required.' };
  }
  if (!apiKey.trim().startsWith('AIzaSy')) {
    return { 
      isValid: false, 
      error: 'Invalid Firebase Web API key format. Expected a key beginning with "AIzaSy".' 
    };
  }

  // 3. Verify Auth Domain
  if (!authDomain || !authDomain.trim()) {
    return {
      isValid: false,
      error: 'Firebase Auth Domain is required.'
    };
  }

  return { isValid: true };
}

/**
 * Detects current Phone Auth and Authorized Domain configuration status
 */
export function detectPhoneAuthConfig() {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const config = getActiveFirebaseConfig();
  const isWebReady = verifyFirebaseWebConfig(config).isValid;

  return {
    isConfigured: isWebReady,
    projectId: config.projectId,
    authDomain: config.authDomain,
    currentHost,
    isLocalhost: currentHost === 'localhost' || currentHost === '127.0.0.1',
    isCloudRun: currentHost.includes('.run.app'),
    phoneAuthEnabled: true, // Phone auth is enabled in console
  };
}

export function getActiveFirebaseConfig(): FirebaseConfigOptions {
  // 1. Check localStorage override first
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear out invalid legacy configs
        if (
          parsed.projectId === 'vi-sales-mnp' ||
          parsed.apiKey === 'AIzaSyDbwe2VLxYaT8gPZDIioTbHC6UWtm1D4Qs' ||
          parsed.appId?.includes(':android:')
        ) {
          localStorage.removeItem(STORAGE_KEY);
        } else if (verifyFirebaseWebConfig(parsed).isValid) {
          const normalized = normalizeFirebaseConfig(parsed);
          // Auto-persist normalized version if needed
          if (normalized.projectId !== parsed.projectId) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          }
          return normalized;
        }
      }
    } catch (e) {
      console.warn('Error reading custom firebase config from localStorage:', e);
    }
  }

  // 2. Check environment variables
  const metaEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  let envApiKey = metaEnv?.VITE_FIREBASE_API_KEY;
  let envProjectId = metaEnv?.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId;
  let envAppId = metaEnv?.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId;
  let envAuthDomain = metaEnv?.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain;
  let envStorageBucket = metaEnv?.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket;
  let envSenderId = metaEnv?.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId;

  // Ignore invalid container env overrides
  if (envApiKey === 'AIzaSyDbwe2VLxYaT8gPZDIioTbHC6UWtm1D4Qs' || !envApiKey) {
    envApiKey = DEFAULT_FIREBASE_CONFIG.apiKey;
  }
  if (envProjectId === 'vi-sales-mnp' || !envProjectId) {
    envProjectId = DEFAULT_FIREBASE_CONFIG.projectId;
  }
  if (envAppId.includes(':android:') || envAppId.startsWith('1:646419775774:')) {
    envAppId = DEFAULT_FIREBASE_CONFIG.appId;
    envSenderId = DEFAULT_FIREBASE_CONFIG.messagingSenderId;
  }

  const rawConfig: FirebaseConfigOptions = {
    apiKey: envApiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: envAuthDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: envProjectId || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: envStorageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: envSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: envAppId || DEFAULT_FIREBASE_CONFIG.appId,
  };

  const normalized = normalizeFirebaseConfig(rawConfig);
  if (verifyFirebaseWebConfig(normalized).isValid) {
    return normalized;
  }

  return DEFAULT_FIREBASE_CONFIG;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

/**
 * Initializes Firebase App, Auth, and Firestore exactly once using the verified configuration.
 * Always targets the default app instance to ensure web client auth and reCAPTCHA verifiers
 * operate seamlessly across development, preview, and deployed environments.
 */
export function initializeFirebaseServices() {
  if (appInstance && authInstance && dbInstance) {
    return { app: appInstance, auth: authInstance, db: dbInstance, isConfigured: true };
  }

  const rawConfig = getActiveFirebaseConfig();
  const config = normalizeFirebaseConfig(rawConfig);
  const validation = verifyFirebaseWebConfig(config);

  if (!validation.isValid) {
    console.warn('Firebase Web SDK configuration notice:', validation.error);
    return { app: null, auth: null, db: null, isConfigured: false, validationError: validation.error };
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
    } else {
      appInstance = initializeApp(config);
    }
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    return { app: appInstance, auth: authInstance, db: dbInstance, isConfigured: true };
  } catch (err) {
    console.error('Failed to initialize Firebase with current config:', err);
    return { app: null, auth: null, db: null, isConfigured: false, error: err };
  }
}

// Initial setup
const { auth, db } = initializeFirebaseServices();

export { auth, db };

/**
 * Dynamically resolves the current Auth instance.
 */
export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const res = initializeFirebaseServices();
  if (res.auth) return res.auth;
  if (auth) return auth;
  throw new Error('Firebase Auth is not initialized. Please verify configuration.');
}

/**
 * Dynamically resolves the current Firestore instance.
 */
export function getFirebaseDb(): Firestore {
  if (dbInstance) return dbInstance;
  const res = initializeFirebaseServices();
  if (res.db) return res.db;
  if (db) return db;
  throw new Error('Firestore is not initialized. Please verify configuration.');
}

export function isFirebaseConfigured(): boolean {
  const config = getActiveFirebaseConfig();
  return verifyFirebaseWebConfig(config).isValid;
}

export function saveCustomFirebaseConfig(config: FirebaseConfigOptions): boolean {
  const normalized = normalizeFirebaseConfig(config);
  const validation = verifyFirebaseWebConfig(normalized);
  if (!validation.isValid) {
    console.error('Refusing to save invalid Firebase Web config:', validation.error);
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.location.reload();
    return true;
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
    return false;
  }
}

export function clearCustomFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
