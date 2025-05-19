
'use server';

import { Timestamp, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { PartialDeep } from 'type-fest'; // You might need to install this: npm install type-fest

interface ActionResult {
  success: boolean;
  message: string;
  userId?: string;
  updatedProfile?: Partial<UserProfile>;
}

export async function createUserProfileInFirestore(
  uid: string,
  email: string,
  displayName: string,
  role: 'lawyer' | 'client',
  phoneNumber?: string
): Promise<ActionResult> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userProfile: UserProfile = {
      uid,
      email,
      displayName,
      role,
      createdAt: serverTimestamp() as Timestamp,
      phoneNumber: phoneNumber || undefined, // Store if provided
    };
    await setDoc(userDocRef, userProfile);

    return { success: true, message: 'User profile created successfully.', userId: uid };
  } catch (error: any) {
    console.error('Error creating user profile in Firestore:', error);
    return { success: false, message: error.message || 'Failed to create user profile in database.' };
  }
}

export async function updateUserProfileDetails(
  uid: string,
  details: PartialDeep<Omit<UserProfile, 'uid' | 'role' | 'createdAt'>> // Allow partial updates for specific fields
): Promise<ActionResult> {
  if (!uid) {
    return { success: false, message: 'User ID is required.' };
  }
  if (Object.keys(details).length === 0) {
    return { success: false, message: 'No details provided for update.' };
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    
    // Prepare data for Firestore, ensuring serverTimestamp for any date fields if necessary
    // For now, we are updating simple string fields like displayName, phoneNumber, photoURL
    const updateData: Record<string, any> = { ...details };

    // Filter out undefined values to prevent overwriting fields with undefined
    for (const key in updateData) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }
    
    await updateDoc(userDocRef, updateData);

    // Construct a partial profile to return for optimistic updates if needed
    const updatedProfileFields: Partial<UserProfile> = {};
    if (details.displayName !== undefined) updatedProfileFields.displayName = details.displayName;
    if (details.phoneNumber !== undefined) updatedProfileFields.phoneNumber = details.phoneNumber;
    if (details.photoURL !== undefined) updatedProfileFields.photoURL = details.photoURL;
    if (details.email !== undefined) updatedProfileFields.email = details.email;


    return { success: true, message: 'Profile updated successfully.', updatedProfile: updatedProfileFields };
  } catch (error: any) {
    console.error('Error updating user profile in Firestore:', error);
    return { success: false, message: error.message || 'Failed to update profile in database.' };
  }
}
