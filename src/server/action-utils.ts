import 'server-only';
import { z } from 'zod';
import { AuthError } from '@/server/session';

/** Runs a server action body and turns expected failures into safe messages. Unexpected errors are logged, not leaked. */
export async function runAction<T>(
  name: string,
  fn: () => Promise<{ success: true; message: string } & T>,
): Promise<({ success: true; message: string } & T) | { success: false; message: string }> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthError || error instanceof UserFacingError) {
      return { success: false, message: error.message };
    }
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0]?.message ?? 'Invalid input.' };
    }
    console.error(`[action:${name}]`, error);
    return { success: false, message: 'Something went wrong. Please try again.' };
  }
}

/** An error whose message is safe to show to the user. */
export class UserFacingError extends Error {}
