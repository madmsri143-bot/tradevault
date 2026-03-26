import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Defensively strip literal quotes injected by raw Vercel environment payloads
      privateKey = privateKey.replace(/"/g, '').replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      console.warn("⚠️ Build-Time Check: Firebase Variables missing, falling back to dummy initializeApp() to prevent compiler evaluation crashes.");
      admin.initializeApp();
    }
  } catch (error) {
    console.error("🔥 FATAL: Firebase admin initialization error. Generating dummy app to prevent complete server crash.", error);
    admin.initializeApp();
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
