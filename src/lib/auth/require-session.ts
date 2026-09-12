import "server-only";

import { headers } from "next/headers";
import { locale as rootLocale } from "next/root-params";
import type { User } from "@/generated/prisma/client";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getPathname } from "@/i18n/navigation";
import { PATHNAME_HEADER } from "@/proxy";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Pour les pages qui necessitent un user connecté
 */

/**
 * Reconstitue le chemin demandé pour pouvoir y revenir après connexion.
 *
 * @returns Le chemin demandé, ou null s'il ne peut pas être déterminé.
 */
async function resolveRequestedPath(): Promise<string | null> {
  const headerList = await headers();

  const candidate = headerList.get(PATHNAME_HEADER);
  return candidate && candidate.startsWith("/") ? candidate : null;
}

/**
 * Verifie si une session est active et redirige vers la page de connexion si ce n'est pas le cas.
 *
 * @param options - Chemin de retour à forcer, utile si l'appelant le connaît
 * mieux que les en têtes de la requête.
 * @returns L'utilisateur connecté, la fonction ne rendant jamais null.
 */
export async function requireSession(options?: {
  returnTo?: string;
}): Promise<User> {
  const user = await getCurrentUser();
  if (user) {
    return user;
  }

  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const returnTo = options?.returnTo ?? (await resolveRequestedPath());
  const signInPath = getPathname({ href: "/connexion", locale });
  const destination = returnTo
    ? `${signInPath}?next=${encodeURIComponent(returnTo)}`
    : signInPath;

  redirect(destination);
}
