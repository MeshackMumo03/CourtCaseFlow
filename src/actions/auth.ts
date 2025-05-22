
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
    // Ensure all fields, especially optional ones for lawyers, are considered.
    const userProfileData: Omit<UserProfile, 'createdAt' | 'uid'> & { uid: string; createdAt: any } = {
      uid,
      email: email!, 
      displayName: displayName!, 
      role,
      createdAt: serverTimestamp(), // Let Firestore handle the timestamp
      phoneNumber: phoneNumber || undefined,
      lawFirmName: role === 'lawyer' ? '' : undefined,
      lawFirmAddress: role === 'lawyer' ? '' : undefined,
      lskRegistrationNumber: undefined, 
      photoURL: undefined,             
      lskVerificationStatus: role === 'lawyer' ? 'unverified' : undefined,
      lawFirmVerificationStatus: role === 'lawyer' ? 'unverified' : undefined,
    };

    // Clean profile data to remove undefined fields before setting to Firestore
    // This prevents Firestore from storing explicit 'undefined' values for optional fields.
    const cleanProfileData: { [key: string]: any } = {};
    for (const key in userProfileData) {
      if (userProfileData[key as keyof typeof userProfileData] !== undefined) {
        cleanProfileData[key] = userProfileData[key as keyof typeof userProfileData];
      }
    }
    
    await setDoc(userDocRef, cleanProfileData);

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
    // This is particularly important for PartialDeep types
    const filterUndefinedRecursively = (obj: any): any => {
      const newObj: Record<string, any> = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Timestamp)) {
            newObj[key] = filterUndefinedRecursively(obj[key]);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
      return newObj;
    };
    
    const cleanedUpdateData = filterUndefinedRecursively(updateData);
    
    await updateDoc(userDocRef, cleanedUpdateData);

    // Construct a partial profile to return for optimistic updates
    // This should reflect the actual fields that were intended to be updated
    const updatedProfileFields: Partial<UserProfile> = {};
    if (details.displayName !== undefined) updatedProfileFields.displayName = details.displayName;
    if (details.phoneNumber !== undefined) updatedProfileFields.phoneNumber = details.phoneNumber;
    if (details.photoURL !== undefined) updatedProfileFields.photoURL = details.photoURL;
    if (details.email !== undefined) updatedProfileFields.email = details.email;
    if (details.lawFirmName !== undefined) updatedProfileFields.lawFirmName = details.lawFirmName;
    if (details.lawFirmAddress !== undefined) updatedProfileFields.lawFirmAddress = details.lawFirmAddress;
    if (details.lskRegistrationNumber !== undefined) updatedProfileFields.lskRegistrationNumber = details.lskRegistrationNumber;
    if (details.lskVerificationStatus !== undefined) updatedProfileFields.lskVerificationStatus = details.lskVerificationStatus;
    if (details.lawFirmVerificationStatus !== undefined) updatedProfileFields.lawFirmVerificationStatus = details.lawFirmVerificationStatus;


    return { success: true, message: 'Profile updated successfully.', updatedProfile: updatedProfileFields };
  } catch (error: any) {
    console.error('Error updating user profile in Firestore:', error);
    return { success: false, message: error.message || 'Failed to update profile in database.' };
  }
}

