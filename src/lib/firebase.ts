
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration (Hardcoded as per previous step)
const firebaseConfig = {
  apiKey: "AIzaSyBMcZTemZQQ01oU5jpKu6GcI3spdaIKNjM",
  authDomain: "caselink-skc52.firebaseapp.com",
  projectId: "caselink-skc52",
  storageBucket: "caselink-skc52.appspot.com", // Corrected to .appspot.com
  messagingSenderId: "798746625437",
  appId: "1:798746625437:web:f2b0f0281d9bd601b61b74"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Initialize Firebase
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error: any) {
    console.error("Error initializing Firebase app with hardcoded config:", error.message);
    throw new Error(`Failed to initialize Firebase app: ${error.message}.`);
  }
} else {
  app = getApp();
}

try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error: any) {
   console.error("Error getting Firebase services (Auth, Firestore, Storage):", error.message);
  // This might indicate a deeper issue with the initialized app instance or config
  throw new Error(`Failed to get Firebase services: ${error.message}.`);
}

export { app, auth, db, storage };

// This function can still be useful if other parts of the app call it,
// but its primary role of dynamic initialization is reduced with hardcoded config.
export const ensureFirebaseInitialized = () => {
  if (!app || getApps().length === 0) {
    // This block should ideally not be hit if the above initialization works.
    console.warn("ensureFirebaseInitialized called when Firebase app was not available or not initialized. This indicates a problem with the initial setup.");
    // Attempt re-initialization, though it's unlikely to succeed if the first attempt failed with hardcoded values.
     if (!getApps().length) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            storage = getStorage(app);
        } catch (error: any) {
            console.error("Re-initialization attempt in ensureFirebaseInitialized failed:", (error as Error).message);
            throw error;
        }
    } else {
        app = getApp();
        auth = getAuth(app); // Ensure auth, db, storage are re-assigned if app was re-fetched
        db = getFirestore(app);
        storage = getStorage(app);
    }
  }
  return { app, auth, db, storage };
};
