
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Dispatch, SetStateAction } from 'react';
import React, { createContext, useEffect, useState } from 'react';
import { auth, db, ensureFirebaseInitialized } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  setUserProfile: Dispatch<SetStateAction<UserProfile | null>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureFirebaseInitialized();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data() as Omit<UserProfile, 'createdAt'> & { createdAt: Timestamp | { seconds: number, nanoseconds: number } };
          
          let createdAtTimestamp: Timestamp;
          if (profileData.createdAt instanceof Timestamp) {
            createdAtTimestamp = profileData.createdAt;
          } else if (profileData.createdAt && typeof profileData.createdAt === 'object' && 'seconds' in profileData.createdAt) {
            // Handle plain object format for Timestamps that sometimes comes from server actions or serialization
            createdAtTimestamp = new Timestamp(profileData.createdAt.seconds, profileData.createdAt.nanoseconds);
          } else {
             // Fallback for newly created users where serverTimestamp might not be resolved yet
            createdAtTimestamp = Timestamp.now();
          }

          const fetchedProfile: UserProfile = {
            ...(userDocSnap.data() as UserProfile),
            createdAt: createdAtTimestamp,
          };
          setUserProfile(fetchedProfile);
        } else {
          // This case might happen if user exists in Auth but not in Firestore (e.g. incomplete signup)
          // Or, if we expect all users to have a profile, this could be an error state.
          console.warn('User profile not found in Firestore for UID:', firebaseUser.uid);
          setUserProfile(null); 
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, setUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
