import type { AccessScope, Grant, VoiceCoverage } from "@/types/domain";

/**
 * Forme minimale d'un produit permettant d'en déduire un droit.
 */
export type GrantableProduct = {
  scope: AccessScope;
  coverage: VoiceCoverage;
  movementId: string | null;
  voice: { code: string } | null;
};

/**
 * Traduit un produit en droit que son achat accorderait.
 *
 * @param workId - Identifiant de l'œuvre à laquelle le produit se rattache.
 * @param product - Produit dont on veut connaître la portée.
 * @returns Le droit correspondant.
 */
export function productToGrant(
  workId: string,
  product: GrantableProduct,
): Grant {
  return {
    workId,
    movementId: product.movementId,
    voiceCode: product.voice?.code ?? null,
    scope: product.scope,
    coverage: product.coverage,
  };
}
