
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration (Hardcoded as per previous step)
const firebaseConfig = {
  apiKey: "AIzaSyBMcZTemZQQ01oU5jpKu6GcI3spdaIKNjM",
  authDomain: "caselink-skc52.firebaseapp.com",
  projectId: "caselink-skc52",
  storageBucket: "caselink-skc52.appspot.com",
  messagingSenderId: "798746625437",
  appId: "1:798746625437:web:f2b0f0281d9bd601b61b74"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initializeServices() {
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
        throw new Error(`Failed to get Firebase services: ${error.message}.`);
    }
}

// Initialize services on module load
initializeServices();

export { app, auth, db, storage };

// This function can still be useful if other parts of the app call it,
// but its primary role of dynamic initialization is reduced with hardcoded config.
export const ensureFirebaseInitialized = () => {
  // Services are already initialized, so this function mainly ensures they are exported correctly.
  // This can be simplified or removed if not strictly necessary elsewhere,
  // but it's safe to keep for compatibility.
  if (!app) {
     console.warn("ensureFirebaseInitialized called when Firebase app was not available. Re-initializing...");
     initializeServices();
  }
  return { app, auth, db, storage };
};
