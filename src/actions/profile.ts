'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { user, type VerificationStatus } from '@/db/schema';
import { runAction, UserFacingError } from '@/server/action-utils';
import { AuthError, getSession, requireUser } from '@/server/session';
import { detectImageType, MAX_AVATAR_BYTES, uploadAvatar } from '@/lib/storage';
import { onboardingSchema, profileSchema, type OnboardingInput, type ProfileInput } from '@/lib/validation';

/** One-time step after sign-up (email or Google): choose a role and add contact details. */
export async function completeOnboardingAction(input: OnboardingInput) {
  return runAction('completeOnboarding', async () => {
    const session = await getSession();
    if (!session) throw new AuthError('You must be signed in.');
    if (session.user.onboarded) throw new UserFacingError('Your profile is already set up.');

    const data = onboardingSchema.parse(input);
    await db
      .update(user)
      .set(
        data.role === 'lawyer'
          ? {
              role: 'lawyer',
              phoneNumber: data.phoneNumber,
              lskRegistrationNumber: data.lskRegistrationNumber,
              lawFirmName: data.lawFirmName,
              lawFirmAddress: data.lawFirmAddress,
              lskVerificationStatus: 'pending_review',
              lawFirmVerificationStatus: 'pending_review',
              onboarded: true,
              updatedAt: new Date(),
            }
          : { role: 'client', phoneNumber: data.phoneNumber, onboarded: true, updatedAt: new Date() },
      )
      .where(eq(user.id, session.user.id));

    return { success: true as const, message: 'Profile set up.' };
  });
}

export async function updateProfileAction(input: ProfileInput) {
  return runAction('updateProfile', async () => {
    const me = await requireUser();
    const data = profileSchema.parse(input);

    const updates: Partial<typeof user.$inferInsert> = {
      name: data.name,
      phoneNumber: data.phoneNumber || null,
      updatedAt: new Date(),
    };

    if (me.role === 'lawyer') {
      const lsk = data.lskRegistrationNumber ?? '';
      if (lsk !== (me.lskRegistrationNumber ?? '')) {
        updates.lskRegistrationNumber = lsk || null;
        updates.lskVerificationStatus = (lsk ? 'pending_review' : 'unverified') satisfies VerificationStatus;
      }
      const firmName = data.lawFirmName ?? '';
      const firmAddress = data.lawFirmAddress ?? '';
      if (firmName !== (me.lawFirmName ?? '') || firmAddress !== (me.lawFirmAddress ?? '')) {
        updates.lawFirmName = firmName || null;
        updates.lawFirmAddress = firmAddress || null;
        updates.lawFirmVerificationStatus = (firmName || firmAddress ? 'pending_review' : 'unverified') satisfies VerificationStatus;
      }
    }

    await db.update(user).set(updates).where(eq(user.id, me.id));
    revalidatePath('/', 'layout');
    return { success: true as const, message: 'Profile updated.' };
  });
}

export async function uploadAvatarAction(formData: FormData) {
  return runAction('uploadAvatar', async () => {
    const me = await requireUser();
    const file = formData.get('avatar');
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError('Choose an image to upload.');
    if (file.size > MAX_AVATAR_BYTES) throw new UserFacingError('Profile pictures must be 2 MB or smaller.');

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!detectImageType(buffer)) throw new UserFacingError('Only PNG or JPEG images are allowed.');

    const url = await uploadAvatar(buffer, me.id);
    await db.update(user).set({ image: url, updatedAt: new Date() }).where(eq(user.id, me.id));
    revalidatePath('/', 'layout');
    return { success: true as const, message: 'Profile picture updated.', data: { url } };
  });
}
