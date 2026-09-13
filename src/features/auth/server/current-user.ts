import "server-only";

import { cache } from "react";

import { auth } from "@/features/auth/server/config";
import { prisma } from "@/server/db/prisma";
import type { User } from "@/generated/prisma/client";

/**
 * Lit la session Auth.js et rend l'utilisateur courant.
 *
 * @returns L'utilisateur connecté, ou null pour un visiteur.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return null;
    }

    return await prisma.user.findUnique({ where: { id: userId } });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.warn(`[auth] Session illisible, visiteur supposé : ${reason}`);
    return null;
  }
});
