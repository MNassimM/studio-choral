import "server-only";

import { cache } from "react";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@/generated/prisma/client";

/**
 * Raccourci de développement permettant de se faire passer pour un compte de
 * démonstration sans ouvrir de session.
 *
 * @returns Le compte de démonstration désigné, ou null si le raccourci ne
 * s'applique pas.

async function resolveImpersonatedUser(): Promise<User | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const email = process.env.DEMO_USER_EMAIL;
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // Trace volontairement bruyante. Confondre un compte usurpé avec un
    // visiteur réel fausserait toute vérification des états d'accès.
    console.warn(
      `[auth] Usurpation de développement active : ${email}. Aucune session réelle n'est lue.`,
    );
  }
  return user;
}
*/

/**
 * Lit la session Auth.js et rend l'utilisateur courant.
 *
 * @returns L'utilisateur connecté, ou null pour un visiteur.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  /*const impersonated = await resolveImpersonatedUser();
  if (impersonated) {
    return impersonated;
  }*/

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
