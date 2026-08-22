/**
 * Invariants du modèle de droit d'accès (LibraryItem) que la base de données
 * ne peut pas exprimer nativement (pas de CHECK constraint conditionnelle
 * ici) - exactement les mêmes règles croisées que Product (voir
 * src/lib/products/invariants.ts), le droit étant la contrepartie d'une
 * offre :
 *
 *   scope = WORK            ⇒ movementId IS NULL
 *   scope = MOVEMENT        ⇒ movementId NOT NULL
 *   coverage = ALL_VOICES   ⇒ voiceId IS NULL
 *   coverage = SINGLE_VOICE ⇒ voiceId NOT NULL
 *
 * TOUTE création de droit (seed, octroi manuel, futur webhook Stripe) doit
 * passer par `libraryItemInputSchema` avant insertion en base.
 *
 * Ne traite PAS la déduplication sémantique (« Alto - œuvre entière » rend
 * « Alto - Kyrie » redondant) : c'est une question de droits EFFECTIFS,
 * hors de portée d'une validation de forme à l'insertion - elle relève de
 * la prochaine étape (lib/access).
 */

import { z } from "zod";

import { accessScopeSchema, voiceCoverageSchema } from "@/lib/products/invariants";

export const grantSourceSchema = z.enum(["PURCHASE", "MANUAL_GRANT", "PROMO"]);
export type GrantSource = z.infer<typeof grantSourceSchema>;

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
 * Schéma complet d'un droit, avec les quatre règles de cohérence
 * scope/coverage <-> movementId/voiceId appliquées comme raffinements -
 * identiques à `productInputSchema`, dupliquées ici (pas réutilisées via
 * `.refine`) car les deux schémas de base portent des champs différents.
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
 * Valide `input` et lève une erreur explicite (avec le userId/workId
 * fautifs) à la première violation, plutôt que de retourner un résultat à
 * vérifier soi-même. Pratique pour les appelants (seed, octroi manuel) qui
 * veulent échouer bruyamment.
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
