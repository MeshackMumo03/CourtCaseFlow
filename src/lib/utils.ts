import { clsx, type ClassValue } from "clsx"
import { Timestamp } from "firebase/firestore";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts any Firestore Timestamps in an object to JSON strings.
 * This is useful for making Firestore data serializable for Next.js server components,
 * preventing "Maximum call stack size exceeded" errors.
 * @param obj The object to process.
 * @returns A new object with Timestamps converted to strings.
 */
export function toSerializable(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toJSON();
  }

  if (Array.isArray(obj)) {
    return obj.map(toSerializable);
  }

  if (typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = toSerializable(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}
