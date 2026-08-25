import { z } from "zod";

/**
 * Invariants du modèle commercial (Product) que la base ne sait pas exprimer.
 *
 * @remarks
 * Postgres n'a pas de contrainte CHECK conditionnelle utilisable ici, ces
 * quatre règles croisées vivent donc dans le code :
 * une portée WORK impose movementId nul, une portée MOVEMENT impose
 * movementId renseigné, une couverture ALL_VOICES impose voiceId nul, et une
 * couverture SINGLE_VOICE impose voiceId renseigné.
 *
 * TOUTE création de produit (seed, back office, futur import) doit passer par
 * productInputSchema avant insertion. Le schéma valide aussi la forme
 * générale : sku non vide, prix entier strictement positif.
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
 *
 * @remarks
 * Chaque raffinement porte son propre message et son propre chemin, pour que
 * l'erreur désigne précisément le champ fautif plutôt qu'un rejet global.
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
 * Valide un produit et échoue bruyamment si quelque chose cloche.
 *
 * @remarks
 * Lève une erreur plutôt que de rendre un résultat à vérifier soi même. Les
 * appelants concernés (seed, admin) veulent s'arrêter net sur une donnée
 * incohérente, pas continuer avec un produit à moitié valide.
 *
 * Le sku fautif est repris dans le message, sinon retrouver la ligne
 * responsable au milieu d'une cinquantaine de produits devient pénible.
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
