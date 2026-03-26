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

// Initialize variables, cast as exact Types to avoid 'implicit any' errors in Next.js build
let app = {} as FirebaseApp;
let db = {} as Firestore;
let auth = {} as Auth;
let storage = {} as FirebaseStorage;
let googleProvider = {} as GoogleAuthProvider;

// Only initialize Firebase on the client-side (where 'window' is defined)
// This strictly prevents Next.js Server-Side Rendering (SSR) from crashing if it tries to access Firebase Auth during Vercel builds.
if (typeof window !== "undefined") {
  // Graceful initialization check
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  storage = getStorage(app);
}

export { app, db, auth, googleProvider, storage };
