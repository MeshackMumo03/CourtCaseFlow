
'use server';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types';

interface ActionResult {
  success: boolean;
  message: string;
}

// In a real application, you would add robust authentication and authorization
// to ensure only legitimate administrators can call this action.
// For this prototype, we are keeping it simple.

export async function updateUserVerificationStatusAction(
  userId: string,
  verificationType: 'lsk' | 'lawFirm',
  newStatus: 'verified' | 'rejected' | 'pending_review' | 'unverified'
): Promise<ActionResult> {
  if (!userId || !verificationType || !newStatus) {
    return { success: false, message: 'Missing required parameters.' };
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const updates: Partial<UserProfile> = {};

    if (verificationType === 'lsk') {
      updates.lskVerificationStatus = newStatus;
    } else if (verificationType === 'lawFirm') {
      updates.lawFirmVerificationStatus = newStatus;
    } else {
      return { success: false, message: 'Invalid verification type.' };
    }

    await updateDoc(userDocRef, updates);

    return { success: true, message: `User ${verificationType} status updated to ${newStatus}.` };
  } catch (error: any) {
    console.error('Error updating user verification status:', error);
    return { success: false, message: error.message || 'Failed to update verification status.' };
  }
}
