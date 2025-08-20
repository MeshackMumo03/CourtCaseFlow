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
 * It also handles objects that look like Timestamps (with seconds/nanoseconds).
 * @param obj The object to process.
 * @returns A new object with Timestamps converted to strings.
 */
export function toSerializable(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle Firestore Timestamp objects
  if (obj instanceof Timestamp) {
    return obj.toJSON();
  }

  // Handle plain objects that look like Timestamps (from previous serializations)
  if (typeof obj === 'object' && obj !== null && 'seconds' in obj && 'nanoseconds' in obj && Object.keys(obj).length === 2) {
    return new Timestamp(obj.seconds, obj.nanoseconds).toJSON();
  }

  // Handle arrays by recursively calling toSerializable on each element
  if (Array.isArray(obj)) {
    return obj.map(toSerializable);
  }

  // Handle general objects by recursively calling toSerializable on their values
  if (typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = toSerializable(obj[key]);
      }
    }
    return newObj;
  }

  // Return primitives as is
  return obj;
}
