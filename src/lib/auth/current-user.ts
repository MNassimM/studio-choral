/**
 * MOCK / TEMPORAIRE
 *
 * Il n'y a pas encore d'authentification (Auth.js viendra plus tard, par
 * magic link). En attendant, l'utilisateur courant est simulé : il s'agit
 * toujours du compte de démonstration dont l'email est donné par la
 * variable d'environnement DEMO_USER_EMAIL (voir .env.example pour la liste
 * des quatre comptes disponibles et l'état qu'ils illustrent chacun).
 *
 * Brancher Auth.js consistera à remplacer le CORPS de cette fonction
 * (résoudre l'utilisateur depuis la session réelle) — rien d'autre. Tout le
 * code qui a besoin de l'utilisateur courant doit appeler getCurrentUser()
 * plutôt que de lire une session ou une variable d'environnement lui-même :
 * c'est ce qui rendra la bascule indolore.
 */

import { prisma } from "@/lib/db/prisma";
import type { User } from "@/generated/prisma/client";

const DEFAULT_DEMO_USER_EMAIL = "demo-alto-partiel@butterfly.test";

export async function getCurrentUser(): Promise<User | null> {
  const email = process.env.DEMO_USER_EMAIL ?? DEFAULT_DEMO_USER_EMAIL;

  return prisma.user.findUnique({ where: { email } });
}
