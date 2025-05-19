'use server';

import { addDoc, collection, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CaseFile } from '@/types';

interface ActionResult {
  success: boolean;
  message: string;
  caseId?: string;
}

export async function createCaseAction(formData: FormData): Promise<ActionResult> {
  try {
    const lawyerUid = formData.get('lawyerUid') as string;
    if (!lawyerUid) {
      return { success: false, message: 'Lawyer UID is missing. User might not be authenticated properly.' };
    }

    const newCase: Omit<CaseFile, 'id' | 'createdAt' | 'updatedAt' | 'documents'> = {
      caseNumber: formData.get('caseNumber') as string,
      clientName: formData.get('clientName') as string,
      clientEmail: formData.get('clientEmail') as string,
      court: formData.get('court') as string,
      status: formData.get('status') as 'active' | 'pending' | 'archived' | 'closed',
      description: formData.get('description') as string || undefined,
      lawyerUid: lawyerUid,
      hearingDate: formData.has('hearingDate') ? Timestamp.fromDate(new Date(formData.get('hearingDate') as string)) : null,
    };

    // Validate required fields
    if (!newCase.caseNumber || !newCase.clientName || !newCase.clientEmail || !newCase.court || !newCase.status) {
        return { success: false, message: "Missing required case fields." };
    }
    
    const caseWithTimestamps = {
      ...newCase,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'cases'), caseWithTimestamps);
    return { success: true, message: 'Case created successfully.', caseId: docRef.id };

  } catch (error: any) {
    console.error('Error creating case:', error);
    return { success: false, message: error.message || 'Failed to create case.' };
  }
}

export async function updateCaseAction(formData: FormData): Promise<ActionResult> {
  try {
    const caseId = formData.get('caseId') as string;
    if (!caseId) {
      return { success: false, message: 'Case ID is missing.' };
    }
    
    const lawyerUid = formData.get('lawyerUid') as string;
    if (!lawyerUid) {
      return { success: false, message: 'Lawyer UID is missing. User might not be authenticated properly.' };
    }

    // Construct the update object, only including fields that are present in formData
    const updates: Partial<CaseFile> = { lawyerUid }; // Ensure lawyerUid is part of updates for ownership check if needed
    if (formData.has('caseNumber')) updates.caseNumber = formData.get('caseNumber') as string;
    if (formData.has('clientName')) updates.clientName = formData.get('clientName') as string;
    if (formData.has('clientEmail')) updates.clientEmail = formData.get('clientEmail') as string;
    if (formData.has('court')) updates.court = formData.get('court') as string;
    if (formData.has('status')) updates.status = formData.get('status') as 'active' | 'pending' | 'archived' | 'closed';
    if (formData.has('description')) updates.description = formData.get('description') as string;
    
    if (formData.has('hearingDate')) {
      const hearingDateStr = formData.get('hearingDate') as string;
      updates.hearingDate = hearingDateStr ? Timestamp.fromDate(new Date(hearingDateStr)) : null;
    } else {
        // If hearingDate is intentionally cleared
        updates.hearingDate = null;
    }
    
    updates.updatedAt = serverTimestamp() as Timestamp;

    const caseDocRef = doc(db, 'cases', caseId);
    await updateDoc(caseDocRef, updates);

    return { success: true, message: 'Case updated successfully.', caseId };
  } catch (error: any) {
    console.error('Error updating case:', error);
    return { success: false, message: error.message || 'Failed to update case.' };
  }
}

// TODO: Add actions for fetching cases (with pagination, filtering, sorting), deleting/archiving cases.
