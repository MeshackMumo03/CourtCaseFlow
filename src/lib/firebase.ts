
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseInstances() {
  // Check if all config values are present and valid strings
  const missingOrInvalidKeys = Object.entries(firebaseConfigValues)
    .filter(([key, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([key]) => key);

  if (missingOrInvalidKeys.length > 0) {
    const errorMessage =
      `Firebase configuration is missing or invalid for keys: ${missingOrInvalidKeys.join(', ')}. ` +
      `Please ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env.local file and the development server has been restarted.`;
    console.error("Firebase Init Error:", errorMessage);
    // Throwing an error here will stop execution and make it clear.
    throw new Error(errorMessage);
  }

  let appInstance: FirebaseApp;
  if (!getApps().length) {
    try {
      appInstance = initializeApp(firebaseConfigValues);
    } catch (error: any) {
      console.error("Error initializing Firebase app:", error.message);
      // Rethrow or handle as appropriate for your app's error strategy
      throw new Error(`Failed to initialize Firebase app: ${error.message}. Check your Firebase config values in .env.local.`);
    }
  } else {
    appInstance = getApp();
  }

  const authInstance = getAuth(appInstance);
  const dbInstance = getFirestore(appInstance);
  const storageInstance = getStorage(appInstance);

  return { appInstance, authInstance, dbInstance, storageInstance };
}

// Initialize and export instances
// This structure ensures initialization happens once.
// We need a way to handle the error during this top-level execution if getFirebaseInstances throws.
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  const instances = getFirebaseInstances();
  app = instances.appInstance;
  auth = instances.authInstance;
  db = instances.dbInstance;
  storage = instances.storageInstance;
} catch (error) {
  // Log the error and potentially set dummy/null instances or rethrow
  // For now, logging is done in getFirebaseInstances. Rethrowing here ensures app doesn't proceed silently.
  console.error("Critical Firebase Initialization Failed at module level:", (error as Error).message);
  // Depending on how you want to handle this, you might:
  // 1. Rethrow the error: throw error; (will stop the app from loading further)
  // 2. Set placeholder/null objects and let parts of the app fail gracefully (more complex)
  // For a development environment, rethrowing is often better to make the issue unmissable.
  throw error; 
}


export { app, auth, db, storage };

export const ensureFirebaseInitialized = () => {
  // If module-level initialization failed, app might be undefined.
  // This function is now more of a check or a way to get instances if they were somehow not set.
  if (!app || getApps().length === 0) {
    console.warn("ensureFirebaseInitialized called when Firebase app was not available or not initialized. Attempting re-initialization.");
    // Attempt to re-initialize. This will throw if config is still bad.
    try {
      const instances = getFirebaseInstances();
      // Re-assign module-level vars as well, in case this was the first successful init path.
      app = instances.appInstance;
      auth = instances.authInstance;
      db = instances.dbInstance;
      storage = instances.storageInstance;
      return instances;
    } catch (error) {
        console.error("Re-initialization attempt in ensureFirebaseInitialized failed:", (error as Error).message);
        throw error; // Rethrow critical initialization error
    }
  }
  return { app, auth, db, storage };
};
