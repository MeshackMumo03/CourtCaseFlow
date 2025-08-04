
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBMcZTemZQQ01oU5jpKu6GcI3spdaIKNjM",
  authDomain: "caselink-skc52.firebaseapp.com",
  databaseURL: "https://caselink-skc52-default-rtdb.firebaseio.com",
  projectId: "caselink-skc52",
  storageBucket: "caselink-skc52.firebasestorage.app",
  messagingSenderId: "798746625437",
  appId: "1:798746625437:web:f2b0f0281d9bd601b61b74"
};


// Robust Firebase initialization
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initializeFirebase() {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
}

// Call initialization
initializeFirebase();


// This function is kept for any explicit server-side initialization checks if needed,
// but the direct exports should now work reliably.
export const ensureFirebaseInitialized = () => {
  // No-op, initialization is handled above.
};


export { app, auth, db, storage };
