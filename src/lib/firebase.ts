
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


// This function ensures that we initialize the app only once.
function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

// Call the function to ensure services are initialized.
initializeFirebase();

// Export the initialized services.
export { app, auth, db, storage };

// This function can be used to ensure initialization has occurred if needed,
// but direct exporting after initialization should be sufficient.
export const ensureFirebaseInitialized = () => {
  if (!app) {
     console.warn("Firebase app was not initialized. Re-initializing...");
     initializeFirebase();
  }
  return { app, auth, db, storage };
};
