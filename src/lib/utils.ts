import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose des classes Tailwind en résolvant les conflits.
 *
 * @remarks
 * clsx assemble les classes en gérant les valeurs conditionnelles et les
 * tableaux, puis twMerge arbitre les conflits Tailwind : si px-2 et px-4 se
 * retrouvent dans la même chaîne, seule la dernière survit. C'est ce qui
 * permet à un composant d'accepter une prop className capable de vraiment
 * écraser ses classes par défaut.
 *
 * @param inputs - Classes à composer, sous n'importe quelle forme acceptée par clsx.
 * @returns La chaîne de classes finale, sans conflit.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
