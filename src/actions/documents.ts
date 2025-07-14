
'use server';

import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { CaseDocument } from '@/types';
import { useAuth } from '@/hooks/use-auth'; // This hook can't be used in server actions directly

interface UploadResult {
  success: boolean;
  message: string;
  document?: CaseDocument;
}

export async function uploadDocumentAction(
  caseId: string,
  uploaderUid: string,
  formData: FormData
): Promise<UploadResult> {
  const file = formData.get('document') as File | null;
  const description = formData.get('description') as string | null;

  if (!file) {
    return { success: false, message: 'No file provided.' };
  }
  if (!caseId || !uploaderUid) {
    return { success: false, message: 'Case ID or uploader ID is missing.' };
  }

  try {
    // 1. Upload file to Firebase Storage
    const filePath = `cases/${caseId}/documents/${Date.now()}_${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);
    const uploadResult = await uploadBytes(fileStorageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // 2. Create document record in Firestore
    const documentsColRef = collection(db, 'cases', caseId, 'documents');
    const newDocData: Omit<CaseDocument, 'id'> = {
      name: file.name,
      description: description || '',
      storagePath: filePath,
      downloadURL,
      uploaderUid,
      uploadedAt: serverTimestamp() as any, // Let server set the timestamp
      mimeType: file.type,
      tags: [],
    };

    const docRef = await addDoc(documentsColRef, newDocData);

    // We can't return the full document with the server timestamp immediately.
    // Instead, we construct a client-side version for immediate UI update.
    const createdDocument: CaseDocument = {
      id: docRef.id,
      ...newDocData,
      uploadedAt: new Date() as any, // Use client time for immediate feedback
    };

    return { success: true, message: 'Document uploaded successfully.', document: createdDocument };
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return { success: false, message: error.message || 'Failed to upload document.' };
  }
}

interface TagSaveResult {
  success: boolean;
  message: string;
}

export async function saveDocumentTagsAction(caseId: string, documentId: string, tags: string[]): Promise<TagSaveResult> {
    if (!caseId || !documentId) {
        return { success: false, message: "Missing case or document ID." };
    }
    
    try {
        const docRef = doc(db, 'cases', caseId, 'documents', documentId);
        await updateDoc(docRef, {
            tags: tags
        });
        return { success: true, message: "Tags saved successfully."};
    } catch (error: any) {
        console.error("Error saving document tags:", error);
        return { success: false, message: error.message || "Failed to save tags."};
    }
}
