import { z } from "zod";

import { accessScopeSchema, voiceCoverageSchema } from "@/lib/products/invariants";

/**
 * Invariants du modèle de droit d'accès (LibraryItem).
 *
 * @remarks
 * Exactement les mêmes règles croisées que Product, ce qui est logique
 * puisqu'un droit est la contrepartie d'une offre achetée :
 * une portée WORK impose movementId nul, une portée MOVEMENT impose
 * movementId renseigné, une couverture ALL_VOICES impose voiceId nul, et une
 * couverture SINGLE_VOICE impose voiceId renseigné.
 *
 * TOUTE création de droit (seed, octroi manuel, futur webhook Stripe) doit
 * passer par libraryItemInputSchema avant insertion en base.
 *
 * Ce module ne traite PAS la déduplication sémantique, c'est à dire le fait
 * que posséder « Alto, œuvre entière » rende « Alto, Kyrie » redondant. C'est
 * une question de droits effectifs, hors de portée d'une validation de forme
 * à l'insertion, et elle relève de src/lib/access/grants.ts.
 */

export const grantSourceSchema = z.enum(["PURCHASE", "MANUAL_GRANT", "PROMO"]);
export type GrantSource = z.infer<typeof grantSourceSchema>;

/**
 * Forme générale d'un droit, avant application des règles croisées.
 */
const libraryItemShapeSchema = z.object({
  userId: z.string().min(1, "userId requis"),
  workId: z.string().min(1, "workId requis"),
  movementId: z.string().min(1).nullable(),
  voiceId: z.string().min(1).nullable(),
  scope: accessScopeSchema,
  coverage: voiceCoverageSchema,
  source: grantSourceSchema.default("PURCHASE"),
  purchaseItemId: z.string().min(1).nullable().default(null),
});

/**
 * Schéma complet d'un droit, règles de cohérence comprises.
 *
 * @remarks
 * Les quatre raffinements sont dupliqués depuis productInputSchema plutôt que
 * réutilisés, parce que les deux schémas de base ne portent pas les mêmes
 * champs et qu'un refine ne se transpose pas d'un objet à l'autre.
 */
export const libraryItemInputSchema = libraryItemShapeSchema
  .refine((item) => item.scope !== "WORK" || item.movementId === null, {
    message: "scope=WORK exige movementId=null",
    path: ["movementId"],
  })
  .refine((item) => item.scope !== "MOVEMENT" || item.movementId !== null, {
    message: "scope=MOVEMENT exige movementId non NULL",
    path: ["movementId"],
  })
  .refine((item) => item.coverage !== "ALL_VOICES" || item.voiceId === null, {
    message: "coverage=ALL_VOICES exige voiceId=null",
    path: ["voiceId"],
  })
  .refine(
    (item) => item.coverage !== "SINGLE_VOICE" || item.voiceId !== null,
    {
      message: "coverage=SINGLE_VOICE exige voiceId non NULL",
      path: ["voiceId"],
    },
  );

export type LibraryItemInput = z.infer<typeof libraryItemInputSchema>;

/**
 * Valide un droit d'accès et échoue bruyamment si quelque chose cloche.
 *
 * @remarks
 * Même parti pris que assertValidProduct : on lève à la première violation
 * plutôt que de rendre un résultat à vérifier. Le couple userId et workId est
 * repris dans le message pour identifier la ligne fautive tout de suite.
 *
 * @param input - Droit candidat, de forme encore inconnue.
 * @returns Le droit validé et typé.
 * @throws {Error} Si la forme ou une des règles croisées n'est pas respectée.
 */
export function assertValidLibraryItem(input: unknown): LibraryItemInput {
  const result = libraryItemInputSchema.safeParse(input);
  if (!result.success) {
    const identity =
      typeof input === "object" && input !== null
        ? `userId="${"userId" in input ? String((input as { userId: unknown }).userId) : "?"}" workId="${"workId" in input ? String((input as { workId: unknown }).workId) : "?"}"`
        : "(entrée invalide)";
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Droit d'accès invalide (${identity}) : ${details}`);
  }
  return result.data;
}
