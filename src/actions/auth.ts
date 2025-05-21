
'use server';

import { Timestamp, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/types';
import type { PartialDeep } from 'type-fest'; 

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
      phoneNumber: phoneNumber || undefined,
      // Initialize law firm fields for lawyers, optional for clients
      lawFirmName: role === 'lawyer' ? '' : undefined,
      lawFirmAddress: role === 'lawyer' ? '' : undefined,
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
  details: PartialDeep<Omit<UserProfile, 'uid' | 'role' | 'createdAt'>> 
): Promise<ActionResult> {
  if (!uid) {
    return { success: false, message: 'User ID is required.' };
  }
  if (Object.keys(details).length === 0) {
    return { success: false, message: 'No details provided for update.' };
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    
    const updateData: Record<string, any> = { ...details };

    // Filter out undefined values to prevent overwriting fields with undefined
    for (const key in updateData) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }
    
    await updateDoc(userDocRef, updateData);

    // Construct a partial profile to return for optimistic updates
    const updatedProfileFields: Partial<UserProfile> = {};
    if (details.displayName !== undefined) updatedProfileFields.displayName = details.displayName;
    if (details.phoneNumber !== undefined) updatedProfileFields.phoneNumber = details.phoneNumber;
    if (details.photoURL !== undefined) updatedProfileFields.photoURL = details.photoURL;
    if (details.email !== undefined) updatedProfileFields.email = details.email;
    if (details.lawFirmName !== undefined) updatedProfileFields.lawFirmName = details.lawFirmName;
    if (details.lawFirmAddress !== undefined) updatedProfileFields.lawFirmAddress = details.lawFirmAddress;


    return { success: true, message: 'Profile updated successfully.', updatedProfile: updatedProfileFields };
  } catch (error: any) {
    console.error('Error updating user profile in Firestore:', error);
    return { success: false, message: error.message || 'Failed to update profile in database.' };
  }
}
