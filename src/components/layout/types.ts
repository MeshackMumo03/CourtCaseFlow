import type { Role } from '@/types';

export interface ShellUser {
  name: string;
  email: string;
  image: string | null;
  role: Role;
}
