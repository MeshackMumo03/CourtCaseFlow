import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined' && !getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else if (typeof window !== 'undefined') {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // For server-side rendering or Node.js environments if needed,
  // though client-side initialization is primary for this setup.
  // This part might need adjustment if using Firebase Admin SDK on server actions extensively.
  // For now, ensuring it doesn't break SSR.
  if (!getApps().length) {
     app = initializeApp(firebaseConfig);
  } else {
     app = getApp();
  }
  auth = getAuth(app); // Auth might not be fully functional server-side without Admin SDK
  db = getFirestore(app);
  storage = getStorage(app);
}


export { app, auth, db, storage };

// Helper function to ensure Firebase is initialized before use, particularly for client-side components
export const ensureFirebaseInitialized = () => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return { app, auth, db, storage };
};
