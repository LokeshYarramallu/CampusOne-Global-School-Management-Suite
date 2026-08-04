/**
 * A lightweight, local equivalent of the clsx + 	ailwind-merge pair used
 * by DeepTrack. CampusOne's calendar port relies on conditional class strings,
 * and this helper gives the same ergonomics without adding new dependencies
 * when the package manager cannot reach the registry.
 *
 * It supports strings, numbers, arrays, and object maps of booleans. It does
 * not resolve conflicting Tailwind utilities — callers must avoid passing
 * mutually exclusive classes for the same CSS property.
 */

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

function toClassString(value: ClassValue): string {
  if (value === null || value === undefined || value === false || value === true) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toClassString).filter(Boolean).join(' ');
  }
  return Object.entries(value)
    .filter(([, flag]) => Boolean(flag))
    .map(([key]) => key)
    .join(' ');
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.map(toClassString).filter(Boolean).join(' ');
}
