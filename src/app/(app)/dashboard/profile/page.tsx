import { ProfileForm } from '@/components/profile/ProfileForm';
import { requirePageUser } from '@/server/session';
import type { Role, VerificationStatus } from '@/types';

export default async function ProfilePage() {
  const user = await requirePageUser();
  return (
    <ProfileForm
      profile={{
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        role: user.role as Role,
        phoneNumber: user.phoneNumber ?? '',
        lawFirmName: user.lawFirmName ?? '',
        lawFirmAddress: user.lawFirmAddress ?? '',
        lskRegistrationNumber: user.lskRegistrationNumber ?? '',
        lskVerificationStatus: user.lskVerificationStatus as VerificationStatus,
        lawFirmVerificationStatus: user.lawFirmVerificationStatus as VerificationStatus,
      }}
    />
  );
}
