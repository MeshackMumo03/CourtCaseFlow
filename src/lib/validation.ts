import { z } from 'zod';
import { CASE_STATUSES } from '@/lib/constants';

const trimmed = (max: number) => z.string().trim().max(max);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{10,20}$/, 'Enter a valid phone number.');

export const lawyerDetailsSchema = z.object({
  lskRegistrationNumber: trimmed(50).min(1, 'LSK Registration Number is required for lawyers.'),
  lawFirmName: trimmed(200).min(1, 'Law Firm Name is required for lawyers.'),
  lawFirmAddress: trimmed(500).min(1, 'Law Firm Address is required for lawyers.'),
});

export const onboardingSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('client'), phoneNumber: phoneSchema }),
  z.object({ role: z.literal('lawyer'), phoneNumber: phoneSchema }).extend(lawyerDetailsSchema.shape),
]);
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSchema = z.object({
  name: trimmed(100).min(2, 'Display name must be at least 2 characters.'),
  phoneNumber: z.union([phoneSchema, z.literal('')]),
  lawFirmName: trimmed(200).optional(),
  lawFirmAddress: trimmed(500).optional(),
  lskRegistrationNumber: trimmed(50).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const caseSchema = z.object({
  caseNumber: trimmed(100).min(1, 'Case number is required.'),
  clientName: trimmed(200).min(1, 'Client name is required.'),
  clientEmail: z.string().trim().toLowerCase().pipe(z.email('Invalid client email address.').max(254)),
  court: trimmed(200).min(1, 'Court is required.'),
  status: z.enum(CASE_STATUSES),
  description: trimmed(5000).optional(),
  /** ISO string from the browser, or empty for "no hearing". */
  hearingDate: z.union([z.iso.datetime({ offset: true }), z.literal('')]).optional(),
});
export type CaseInput = z.infer<typeof caseSchema>;

export const commentSchema = z.object({
  text: trimmed(5000).min(1, 'Comment cannot be empty.'),
});

export const tagsSchema = z.array(trimmed(50).min(1)).max(20);
