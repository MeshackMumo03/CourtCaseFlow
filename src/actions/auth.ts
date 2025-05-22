
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
    const userProfileData: Omit<UserProfile, 'createdAt' | 'uid'> & { uid: string; createdAt: any } = {
      uid,
      email: email!, 
      displayName: displayName!, 
      role,
      createdAt: serverTimestamp(),
      phoneNumber: phoneNumber || undefined,
      lawFirmName: role === 'lawyer' ? '' : undefined,
      lawFirmAddress: role === 'lawyer' ? '' : undefined,
      lskRegistrationNumber: role === 'lawyer' ? '' : undefined, 
      photoURL: undefined,             
      lskVerificationStatus: role === 'lawyer' ? 'unverified' : undefined,
      lawFirmVerificationStatus: role === 'lawyer' ? 'unverified' : undefined,
    };

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
    
    const updateData: { [key: string]: any } = { ...details };
    
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
    
    // Handle LSK verification status update specifically based on LSK number changes
    if (details.lskRegistrationNumber !== undefined) { // Check if lskRegistrationNumber is part of the update
      if (details.lskRegistrationNumber) { // If it's being set or changed to a non-empty value
        cleanedUpdateData.lskVerificationStatus = 'pending_review';
      } else { // If it's being explicitly cleared
        cleanedUpdateData.lskVerificationStatus = 'unverified';
      }
    }

    // Handle Law Firm verification status update
    let firmDetailsChanged = false;
    if (details.lawFirmName !== undefined) {
        firmDetailsChanged = true;
    }
    if (details.lawFirmAddress !== undefined) {
        firmDetailsChanged = true;
    }

    if (firmDetailsChanged) {
        if (details.lawFirmName || details.lawFirmAddress) { // If either firm name or address is being set/changed
            cleanedUpdateData.lawFirmVerificationStatus = 'pending_review';
        } else if (details.lawFirmName === '' && details.lawFirmAddress === '') { // If both are explicitly cleared
            cleanedUpdateData.lawFirmVerificationStatus = 'unverified';
        }
    }
    
    await updateDoc(userDocRef, cleanedUpdateData);

    const updatedProfileFields: Partial<UserProfile> = {};
    if (details.displayName !== undefined) updatedProfileFields.displayName = details.displayName;
    if (details.phoneNumber !== undefined) updatedProfileFields.phoneNumber = details.phoneNumber;
    if (details.photoURL !== undefined) updatedProfileFields.photoURL = details.photoURL;
    if (details.email !== undefined) updatedProfileFields.email = details.email;
    if (details.lawFirmName !== undefined) updatedProfileFields.lawFirmName = details.lawFirmName;
    if (details.lawFirmAddress !== undefined) updatedProfileFields.lawFirmAddress = details.lawFirmAddress;
    if (details.lskRegistrationNumber !== undefined) updatedProfileFields.lskRegistrationNumber = details.lskRegistrationNumber;
    
    // Ensure verification statuses are included in the returned profile if they were part of the update
    if (cleanedUpdateData.lskVerificationStatus !== undefined) {
      updatedProfileFields.lskVerificationStatus = cleanedUpdateData.lskVerificationStatus;
    }
    if (cleanedUpdateData.lawFirmVerificationStatus !== undefined) {
      updatedProfileFields.lawFirmVerificationStatus = cleanedUpdateData.lawFirmVerificationStatus;
    }

    return { success: true, message: 'Profile updated successfully.', updatedProfile: updatedProfileFields };
  } catch (error: any) {
    console.error('[updateUserProfileDetails] Error:', error);
    return { success: false, message: error.message || 'Failed to update profile in database.' };
  }
}
