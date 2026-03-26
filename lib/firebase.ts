import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = typeof window !== "undefined" 
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) 
  : ({} as FirebaseApp);

const db: Firestore = typeof window !== "undefined" 
  ? getFirestore(app) 
  : ({} as Firestore);

const auth: Auth = typeof window !== "undefined" 
  ? getAuth(app) 
  : ({} as Auth);

const storage: FirebaseStorage = typeof window !== "undefined" 
  ? getStorage(app) 
  : ({} as FirebaseStorage);

const googleProvider: GoogleAuthProvider = typeof window !== "undefined" 
  ? new GoogleAuthProvider() 
  : ({} as GoogleAuthProvider);

export { app, db, auth, googleProvider, storage };
