import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose des classes Tailwind en résolvant les conflits.
 *
 * @param inputs - Classes à composer, sous n'importe quelle forme acceptée par clsx.
 * @returns La chaîne de classes finale, sans conflit.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
