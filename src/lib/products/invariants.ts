/**
 * Invariants du modèle commercial (Product) que la base de données ne peut
 * pas exprimer nativement (elle n'a pas de CHECK constraint conditionnelle
 * ici) :
 *
 *   scope = WORK            ⇒ movementId IS NULL
 *   scope = MOVEMENT        ⇒ movementId NOT NULL
 *   coverage = ALL_VOICES   ⇒ voiceId IS NULL
 *   coverage = SINGLE_VOICE ⇒ voiceId NOT NULL
 *
 * TOUTE création de produit (seed, back-office, import futur) doit passer
 * par `productInputSchema` avant insertion en base. Le schéma valide aussi
 * la forme générale d'un produit (types, sku non vide, prix strictement
 * positif) en plus de ces quatre règles croisées.
 */

import { z } from "zod";

export const accessScopeSchema = z.enum(["MOVEMENT", "WORK"]);
export type AccessScope = z.infer<typeof accessScopeSchema>;

export const voiceCoverageSchema = z.enum(["SINGLE_VOICE", "ALL_VOICES"]);
export type VoiceCoverage = z.infer<typeof voiceCoverageSchema>;

const productShapeSchema = z.object({
  sku: z.string().min(1, "sku requis"),
  name: z.string().min(1, "name requis"),
  workId: z.string().min(1, "workId requis"),
  movementId: z.string().min(1).nullable(),
  voiceId: z.string().min(1).nullable(),
  scope: accessScopeSchema,
  coverage: voiceCoverageSchema,
  priceCents: z
    .number()
    .int()
    .positive("priceCents doit être un entier positif"),
  currency: z.string().min(1).default("EUR"),
  isActive: z.boolean().default(true),
  position: z.number().int(),
});

/**
 * Schéma complet d'un produit, avec les quatre règles de cohérence
 * scope/coverage <-> movementId/voiceId appliquées comme raffinements.
 * Chaque message d'erreur inclut le sku fautif pour un diagnostic immédiat.
 */
export const productInputSchema = productShapeSchema
  .refine((p) => p.scope !== "WORK" || p.movementId === null, {
    message: "scope=WORK exige movementId=null",
    path: ["movementId"],
  })
  .refine((p) => p.scope !== "MOVEMENT" || p.movementId !== null, {
    message: "scope=MOVEMENT exige movementId non NULL",
    path: ["movementId"],
  })
  .refine((p) => p.coverage !== "ALL_VOICES" || p.voiceId === null, {
    message: "coverage=ALL_VOICES exige voiceId=null",
    path: ["voiceId"],
  })
  .refine((p) => p.coverage !== "SINGLE_VOICE" || p.voiceId !== null, {
    message: "coverage=SINGLE_VOICE exige voiceId non NULL",
    path: ["voiceId"],
  });

export type ProductInput = z.infer<typeof productInputSchema>;

/**
 * Valide `input` et lève une erreur explicite (avec le sku fautif) à la
 * première violation, plutôt que de retourner un résultat à vérifier soi-même.
 * Pratique pour les appelants (seed, admin) qui veulent échouer bruyamment.
 */
export function assertValidProduct(input: unknown): ProductInput {
  const result = productInputSchema.safeParse(input);
  if (!result.success) {
    const sku =
      typeof input === "object" && input !== null && "sku" in input
        ? String((input as { sku: unknown }).sku)
        : "(sku inconnu)";
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Produit invalide (sku="${sku}") : ${details}`);
  }
  return result.data;
}
