
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Your web app's Firebase configuration
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
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
}

// Initialize services on module load.
// This ensures that Firebase is ready whenever any of these exports are imported.
initializeServices();

export { app, auth, db, storage };

// This function ensures that if this module is imported in different parts of the app
// (e.g., client-side and server-side), the services are consistently initialized and available.
export const ensureFirebaseInitialized = () => {
  if (!app) {
     console.warn("ensureFirebaseInitialized called when Firebase app was not available. Re-initializing...");
     initializeServices();
  }
  return { app, auth, db, storage };
};
