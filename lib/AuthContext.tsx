"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profileRef = doc(db, "users", firebaseUser.uid, "settings", "profile");
          const profileSnap = await getDoc(profileRef);
          const now = Date.now();

          if (profileSnap.exists()) {
            const data = profileSnap.data();
            const lastActive = data.lastActive || 0;
            const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;

            if (now - lastActive > fourDaysInMs) {
              // Forced logout due to inactivity > 4 days
              console.log("Session expired due to 4 days inactivity.");
              localStorage.setItem("sessionExpired", "true");
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
            } else {
              // Trial Logic: Ensure trialStartedAt exists
              if (!data.trialStartedAt) {
                await setDoc(profileRef, { trialStartedAt: now }, { merge: true });
              }
              // Update last active
              localStorage.setItem("lastActive", now.toString());
              await setDoc(profileRef, { lastActive: now }, { merge: true });
            }
          }
          // Profile may not exist during sign up, so let them through to finish setup
          setUser(firebaseUser);
        } catch (err) {
          console.error("Auth session check failed:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
