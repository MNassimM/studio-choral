import { z } from "zod";

import {
  accessScopeSchema,
  voiceCoverageSchema,
} from "@/lib/products/invariants";

/**
 * Invariants du modèle de droit d'accès (LibraryItem).
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
  .refine((item) => item.coverage !== "SINGLE_VOICE" || item.voiceId !== null, {
    message: "coverage=SINGLE_VOICE exige voiceId non NULL",
    path: ["voiceId"],
  });

export type LibraryItemInput = z.infer<typeof libraryItemInputSchema>;

/**
 * Valide un droit d'accès
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
