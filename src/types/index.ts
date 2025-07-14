
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'lawyer' | 'client';
  createdAt: Timestamp;
  photoURL?: string;
  phoneNumber?: string;
  
  // Lawyer-specific fields
  lawFirmName?: string;
  lawFirmAddress?: string;
  lskRegistrationNumber?: string;
  lskVerificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected';
  lawFirmVerificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected';
}

export interface CaseDocument {
  id: string;
  name: string;
  description: string;
  storagePath: string; // Path in Firebase Storage
  downloadURL: string;
  uploadedAt: Timestamp;
  uploaderUid: string; // UID of the lawyer who uploaded
  tags?: string[];
  mimeType?: string;
}

export interface CaseFile {
  id: string; // Firestore document ID
  caseNumber: string;
  clientName: string; // Simplified for now
  clientEmail: string; // Simplified for now
  // clientUid?: string; // UID of the client user, future enhancement for linking
  court: string;
  status: 'active' | 'archived' | 'pending' | 'closed';
  description?: string;
  lawyerUid: string; // UID of the lawyer managing the case
  createdAt: Timestamp;
  updatedAt: Timestamp;
  hearingDate?: Timestamp | null;
  // milestones: { // Future enhancement
  //   initiation?: Timestamp;
  //   hearing?: Timestamp;
  //   submission?: Timestamp;
  //   closure?: Timestamp;
  // };
  // documents: CaseDocument[]; // Storing documents as a subcollection is better
}
