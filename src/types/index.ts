import type { CaseStatus, Role, VerificationStatus } from '@/lib/constants';

export { CASE_STATUSES, ROLES, VERIFICATION_STATUSES } from '@/lib/constants';
export type { CaseStatus, Role, VerificationStatus };

export interface CaseFile {
  id: string;
  caseNumber: string;
  clientName: string;
  clientEmail: string;
  court: string;
  status: CaseStatus;
  description: string | null;
  lawyerId: string;
  hearingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Document metadata safe to send to the browser (no storage key). */
export interface CaseDocument {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  uploadedAt: Date;
}

export interface CaseComment {
  id: string;
  text: string;
  createdAt: Date;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorImage: string | null;
}

/** Profile details one user may see about another (no internal fields). */
export interface PublicProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  phoneNumber: string | null;
  lawFirmName: string | null;
  lawFirmAddress: string | null;
  lskRegistrationNumber: string | null;
  lskVerificationStatus: VerificationStatus;
  lawFirmVerificationStatus: VerificationStatus;
  createdAt: Date;
}

export type ActionResult<T = undefined> =
  | ({ success: true; message: string } & (T extends undefined ? object : { data: T }))
  | { success: false; message: string };
