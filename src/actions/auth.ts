'use server';

import { createUserWithEmailAndPassword, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; // Ensure server-side Firebase Admin is NOT initialized here for client actions
import type { UserProfile } from '@/types';

interface SignUpResult {
  success: boolean;
  message: string;
  userId?: string;
}

export async function signUpUser(formData: FormData): Promise<SignUpResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;
  const role = formData.get('role') as 'lawyer' | 'client';

  if (!email || !password || !displayName || !role) {
    return { success: false, message: 'Missing required fields.' };
  }

  if (!['lawyer', 'client'].includes(role)) {
    return { success: false, message: 'Invalid role specified.' };
  }
  
  try {
    // This uses the client SDK's createUserWithEmailAndPassword.
    // For true server actions without client-side Firebase logic, you'd use Firebase Admin SDK.
    // However, Next.js server actions can call client SDK methods if Firebase is initialized appropriately.
    // This is a hybrid approach. Let's assume Firebase client SDK is initialized for this server action context.
    // If this causes issues (e.g. "window is not defined"), this needs to be a client-side call that then calls a server action
    // to store data in Firestore, OR use Firebase Admin SDK.
    // For simplicity and to avoid Admin SDK setup immediately, we'll proceed, but note this nuance.
    // A better pattern for pure server actions would be to handle auth with client SDK, then call a server action to write to DB.

    // The following approach is problematic in a pure server action if `auth` is client-sdk based.
    // Let's adjust this: The signup form should handle Firebase Auth client-side, then call a server action to create the Firestore user document.
    // This file would then only contain the Firestore document creation part.

    // For now, I'll write it assuming it *could* work if firebase client SDK is somehow available,
    // but a more robust way is to split:
    // 1. Client-side: Firebase Auth user creation.
    // 2. Server-side (this action): Firestore document creation, receiving UID from client.

    // Re-evaluating: Server actions *can* use the client SDK if it's initialized.
    // However, this is often not recommended for auth operations that Admin SDK handles better server-side.
    // Let's try to stick to the server action pattern and see.
    // If it fails, the SignupForm.tsx will be refactored.
    
    // This function is better called from the client-side after Firebase Auth user creation.
    // Let's rename it and assume it's called after successful Firebase Auth signup on the client.
    // So, this server action will *only* create the Firestore document.
    
    // The form will call createUserWithEmailAndPassword client-side, then call this server action.
    // This server action `createUserProfileInFirestore` is what's needed.

    return { success: false, message: "This server action should be for Firestore profile creation. Auth creation happens client-side." };

  } catch (error: any) {
    console.error('Sign up error:', error);
    return { success: false, message: error.message || 'An unexpected error occurred during sign up.' };
  }
}


export async function createUserProfileInFirestore(uid: string, email: string, displayName: string, role: 'lawyer' | 'client'): Promise<SignUpResult> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userProfile: UserProfile = {
      uid,
      email,
      displayName,
      role,
      createdAt: serverTimestamp() as Timestamp, // Firestore will convert this to a Timestamp
    };
    await setDoc(userDocRef, userProfile);

    return { success: true, message: 'User profile created successfully.', userId: uid };
  } catch (error: any) {
    console.error('Error creating user profile in Firestore:', error);
    // Potentially delete Firebase Auth user if Firestore write fails for consistency
    // This requires Firebase Admin SDK usually.
    return { success: false, message: error.message || 'Failed to create user profile in database.' };
  }
}


// Note: Actual sign-in logic is handled client-side by Firebase SDK.
// Logout also client-side.
