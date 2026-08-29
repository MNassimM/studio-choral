import { z } from "zod";

/**
 * Invariants du modèle commercial (Product) que la base ne sait pas exprimer.
 */

export const accessScopeSchema = z.enum(["MOVEMENT", "WORK"]);
export type AccessScope = z.infer<typeof accessScopeSchema>;

export const voiceCoverageSchema = z.enum(["SINGLE_VOICE", "ALL_VOICES"]);
export type VoiceCoverage = z.infer<typeof voiceCoverageSchema>;

/**
 * Forme générale d'un produit, avant application des règles croisées.
 */
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
 * Schéma complet d'un produit, règles de cohérence comprises.
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
 * Valide un produit
 *
 * @param input - Produit candidat, de forme encore inconnue.
 * @returns Le produit validé et typé.
 * @throws {Error} Si la forme ou une des règles croisées n'est pas respectée.
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
