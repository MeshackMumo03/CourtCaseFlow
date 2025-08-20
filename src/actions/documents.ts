
'use server';

import { addDoc, collection, doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage';
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
    switch (error.code) {
        case 'storage/unauthorized':
            return {
                success: false,
                message: 'Permission Denied: Your security rules do not allow file uploads. Please check your Firebase Storage rules.'
            };
        case 'storage/unknown':
            return {
                success: false,
                message: "Firebase Storage Error: This is often a CORS configuration issue. Please check your bucket's CORS settings in the Google Cloud console. Your app's domain must be an allowed origin."
            };
        default:
            return { success: false, message: error.message || 'Failed to upload document.' };
    }
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

interface DeleteResult {
    success: boolean;
    message: string;
}

export async function deleteDocumentAction(caseId: string, documentId: string, storagePath: string): Promise<DeleteResult> {
    if (!caseId || !documentId || !storagePath) {
        return { success: false, message: "Missing required parameters for deletion."};
    }

    try {
        // 1. Delete file from Firebase Storage
        const fileRef = storageRef(storage, storagePath);
        await deleteObject(fileRef);

        // 2. Delete document record from Firestore
        const docRef = doc(db, 'cases', caseId, 'documents', documentId);
        await deleteDoc(docRef);

        return { success: true, message: "Document deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting document:", error);
        // If Firestore deletion fails after storage deletion, there's a dangling reference.
        // A more robust system might have retry logic or a cleanup function.
        if (error.code === 'storage/object-not-found') {
             // If file is already gone from storage, try to delete firestore doc anyway
            try {
                const docRef = doc(db, 'cases', caseId, 'documents', documentId);
                await deleteDoc(docRef);
                return { success: true, message: "Document record cleaned up." };
            } catch (dbError: any) {
                 return { success: false, message: dbError.message || "Failed to delete document record."};
            }
        }
        return { success: false, message: error.message || "Failed to delete document." };
    }
}
