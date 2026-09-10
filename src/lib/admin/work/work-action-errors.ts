import { Prisma } from "@/generated/prisma/client";

/**
 * Le contrat de retour des actions d'administration, et sa traduction d'erreur.
 */

/** Ce qu'une action rend, en succès comme en refus. */
export type ActionResult =
  { ok: true; workId: string } | { ok: false; error: string; field?: string };

/** Une erreur dont le message est déjà rédigé pour l'administrateur. */
export class ActionError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

/**
 * Traduit une erreur en résultat lisible, sans laisser fuir Prisma.
 *
 * @param cause - L'erreur interceptée.
 * @returns Le refus à renvoyer à l'administrateur.
 */
export function toFailure(cause: unknown): ActionResult {
  if (cause instanceof ActionError) {
    return { ok: false, error: cause.message, field: cause.field };
  }

  if (
    cause instanceof Prisma.PrismaClientKnownRequestError &&
    cause.code === "P2002"
  ) {
    const cibles = Array.isArray(cause.meta?.target)
      ? (cause.meta.target as string[])
      : [];
    if (cibles.some((cible) => cible.includes("slug"))) {
      return { ok: false, error: "Ce slug est déjà utilisé.", field: "slug" };
    }
    return { ok: false, error: "Cette valeur est déjà utilisée." };
  }

  console.error("work-actions", cause);
  return { ok: false, error: "L'enregistrement a échoué." };
}
