import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import type { User } from "@/generated/prisma/client";

/**
 * Si le user est admin.
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN" && user.emailVerified !== null;
}

/**
 * Renvoie l'utilisateur courant s'il est administrateur, null sinon.
 */
export async function getCurrentAdmin(): Promise<User | null> {
  const user = await getCurrentUser();
  return isAdmin(user) ? user : null;
}

/**
 * Renvoie l'administrateur courant, ou lève une erreur si la personne n'en est pas un.
 */
export async function requireAdmin(): Promise<User> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("Accès administrateur requis.");
  return admin;
}
