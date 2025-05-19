
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBMcZTemZQQ01oU5jpKu6GcI3spdaIKNjM",
  authDomain: "caselink-skc52.firebaseapp.com",
  projectId: "caselink-skc52",
  storageBucket: "caselink-skc52.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "798746625437",
  appId: "1:798746625437:web:f2b0f0281d9bd601b61b74"
};

function getFirebaseInstances() {
  let appInstance: FirebaseApp;
  if (!getApps().length) {
    try {
      appInstance = initializeApp(firebaseConfig);
    } catch (error: any) {
      console.error("Error initializing Firebase app:", error.message);
      // Rethrow or handle as appropriate for your app's error strategy
      throw new Error(`Failed to initialize Firebase app: ${error.message}. Check your hardcoded Firebase config.`);
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
  console.error("Critical Firebase Initialization Failed at module level:", (error as Error).message);
  throw error; 
}


export { app, auth, db, storage };

export const ensureFirebaseInitialized = () => {
  if (!app || getApps().length === 0) {
    console.warn("ensureFirebaseInitialized called when Firebase app was not available or not initialized. Attempting re-initialization with hardcoded config.");
    try {
      const instances = getFirebaseInstances();
      app = instances.appInstance;
      auth = instances.authInstance;
      db = instances.dbInstance;
      storage = instances.storageInstance;
      return instances;
    } catch (error) {
        console.error("Re-initialization attempt in ensureFirebaseInitialized failed:", (error as Error).message);
        throw error;
    }
  }
  return { app, auth, db, storage };
};
