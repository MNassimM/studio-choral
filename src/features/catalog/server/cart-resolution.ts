import "server-only";

import { getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { getUserGrants } from "@/features/catalog/server/access-grants";
import { buildWorkAccessInput } from "@/features/catalog/server/work-access-input";
import { prisma } from "@/server/db/prisma";
import { coverUrl } from "@/server/storage/cover-url";
import {
  EMPTY_RESOLVED_CART,
  type ResolvedCart,
  type ResolvedCartLine,
} from "@/features/cart/domain/resolved-cart";
import { priceCart, type PricedProduct } from "@/domain/pricing/cart-pricing";
import { composeProductDisplayName } from "@/domain/product/product-display-name";
import { resolveWorkTranslation } from "@/features/work/domain/resolve-translation";
import { translateVoiceCode } from "@/features/work/domain/voice-label";
import type { AppLocale } from "@/i18n/routing";
import type { Grant, WorkAccessInput } from "@/domain/types";

/**
 * Nombre maximal de références acceptées en une résolution.
 */
const MAX_SKUS = 200;

/**
 * Nettoie la liste de références envoyée par le navigateur.
 *
 * @param skus - Références telles qu'elles arrivent du client.
 * @returns Des références uniques, non vides et en nombre borné.
 */
function sanitizeSkus(skus: unknown): string[] {
  if (!Array.isArray(skus)) return [];
  const unique = new Set<string>();
  for (const sku of skus) {
    if (typeof sku !== "string") continue;
    const trimmed = sku.trim();
    if (trimmed.length === 0 || trimmed.length > 128) continue;
    unique.add(trimmed);
    if (unique.size >= MAX_SKUS) break;
  }
  return Array.from(unique);
}

/**
 * Résout les lignes d'un panier en noms, prix, remises et total.
 *
 * @param rawSkus - Références des articles présents dans le panier.
 * @param locale - Locale servant à composer les noms affichés.
 * @returns Le panier résolu, dans l'ordre des références reçues.
 */
export async function resolveCart(
  rawSkus: unknown,
  locale: AppLocale,
): Promise<ResolvedCart> {
  const skus = sanitizeSkus(rawSkus);
  if (skus.length === 0) return EMPTY_RESOLVED_CART;

  const [products, currentUser, t] = await Promise.all([
    prisma.product.findMany({
      where: { sku: { in: skus }, isActive: true },
      include: {
        voice: true,
        movement: { select: { id: true, title: true } },
        work: {
          include: {
            movements: {
              select: { id: true, audioFiles: { select: { voiceId: true } } },
            },
            translations: { where: { locale } },
          },
        },
      },
    }),
    getCurrentUser(),
    getTranslations({ locale, namespace: "work" }),
  ]);

  const grants: Grant[] = currentUser
    ? await getUserGrants(currentUser.id)
    : [];

  const voices = await prisma.voice.findMany({ orderBy: { position: "asc" } });
  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));

  const layouts = new Map<string, WorkAccessInput>();
  const workTitles = new Map<string, string>();
  const workComposers = new Map<string, string>();
  const workCovers = new Map<string, string | null>();
  const movementCounts = new Map<string, number>();

  for (const product of products) {
    if (layouts.has(product.workId)) continue;
    layouts.set(
      product.workId,
      buildWorkAccessInput(
        product.workId,
        product.work.movements,
        voiceCodeById,
      ),
    );
    workTitles.set(
      product.workId,
      resolveWorkTranslation(product.work, locale).title,
    );
    workComposers.set(product.workId, product.work.composer);
    workCovers.set(
      product.workId,
      product.work.coverImageKey ? coverUrl(product.work.coverImageKey) : null,
    );
    movementCounts.set(product.workId, product.work.movements.length);
  }

  /**
   * Rend le libellé traduit d'un pupitre, ou son code brut.
   *
   * @param code - Code du pupitre.
   * @returns Le libellé affiché.
   */
  function voiceLabel(code: string): string {
    return translateVoiceCode(code, (known) => t(`voice.${known}`));
  }

  const pricedProducts = new Map<string, PricedProduct>();
  const movementTitles = new Map<string, string | null>();
  const voiceLabels = new Map<string, string>();

  for (const product of products) {
    const label = product.voice ? voiceLabel(product.voice.code) : null;
    const workTitle = workTitles.get(product.workId) ?? product.work.title;
    const targetTitle =
      product.scope === "WORK"
        ? workTitle
        : (product.movement?.title ?? workTitle);

    pricedProducts.set(product.sku, {
      sku: product.sku,
      workId: product.workId,
      movementId: product.movementId,
      voiceCode: product.voice?.code ?? null,
      scope: product.scope,
      coverage: product.coverage,
      priceCents: product.priceCents,
      currency: product.currency,
      name: composeProductDisplayName({
        voiceLabel: label,
        targetTitle,
        t: (key, values) => t(`product.${key}`, values),
      }),
    });
    movementTitles.set(product.sku, product.movement?.title ?? null);
    voiceLabels.set(product.sku, label ?? t("product.allVoices"));
  }

  const priced = priceCart({
    skus,
    products: pricedProducts,
    layouts,
    grants,
  });

  const lines: ResolvedCartLine[] = priced.lines.map((line) => {
    const product = pricedProducts.get(line.sku);
    return {
      sku: line.sku,
      name: line.name,
      workId: product?.workId ?? "",
      workTitle: product ? (workTitles.get(product.workId) ?? null) : null,
      workComposer: product
        ? (workComposers.get(product.workId) ?? null)
        : null,
      workCoverUrl: product ? (workCovers.get(product.workId) ?? null) : null,
      voiceLabel: voiceLabels.get(line.sku) ?? null,
      movementId: product?.movementId ?? null,
      movementTitle: movementTitles.get(line.sku) ?? null,
      workMovementCount: product
        ? (movementCounts.get(product.workId) ?? 0)
        : 0,
      priceCents: line.priceCents,
      currency: line.currency,
      discount: line.discount
        ? {
            percentOff: line.discount.percentOff,
            originalCents: line.discount.originalCents,
            discountedCents: line.discount.discountedCents,
          }
        : null,
      payableCents: line.payableCents,
      unavailable: line.unavailable,
    };
  });

  return {
    lines,
    totalCents: priced.totalCents,
    currency: priced.currency,
    unavailableCount: priced.unavailableCount,
  };
}
