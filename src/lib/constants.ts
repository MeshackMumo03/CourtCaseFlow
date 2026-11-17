/** Shared constants, safe to import from client components. */
export const ROLES = ['client', 'lawyer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_STATUSES = ['unverified', 'pending_review', 'verified', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const CASE_STATUSES = ['pending', 'active', 'closed', 'archived'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
