import type { CartItem, StoredCart } from "@/features/cart/domain/types";

/**
 * Version du format écrit dans le stockage.
 */
export const CART_STORAGE_VERSION = 1;

/**
 * Vérifie qu'une valeur est une chaîne non vide.
 *
 * @param value - Valeur à contrôler.
 * @returns Vrai lorsque la valeur est une chaîne comportant au moins un caractère.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Vérifie qu'une valeur est une chaîne non vide ou nulle.
 *
 * @param value - Valeur à contrôler.
 * @returns Vrai lorsque la valeur est nulle ou une chaîne non vide.
 */
function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

/**
 * Valide une ligne de panier lue depuis le stockage.
 *
 * @param value - Valeur brute issue du JSON.
 * @returns La ligne validée, ou null si elle est inexploitable.
 */
function parseCartItem(value: unknown): CartItem | null {
  if (value === null || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  if (!isNonEmptyString(raw.sku)) return null;
  if (!isNonEmptyString(raw.workId)) return null;
  if (!isNullableString(raw.movementId)) return null;
  if (!isNullableString(raw.voiceCode)) return null;
  if (raw.scope !== "MOVEMENT" && raw.scope !== "WORK") return null;
  if (raw.coverage !== "SINGLE_VOICE" && raw.coverage !== "ALL_VOICES") {
    return null;
  }
  if (typeof raw.addedAt !== "number" || !Number.isFinite(raw.addedAt)) {
    return null;
  }

  const movementMatchesScope =
    raw.scope === "WORK" ? raw.movementId === null : raw.movementId !== null;
  if (!movementMatchesScope) return null;

  const voiceMatchesCoverage =
    raw.coverage === "ALL_VOICES"
      ? raw.voiceCode === null
      : raw.voiceCode !== null;
  if (!voiceMatchesCoverage) return null;

  return {
    sku: raw.sku,
    workId: raw.workId,
    movementId: raw.movementId,
    voiceCode: raw.voiceCode,
    scope: raw.scope,
    coverage: raw.coverage,
    addedAt: raw.addedAt,
  };
}

/**
 * Écrit un panier au format de stockage.
 *
 * @param items - Lignes à conserver.
 * @returns La chaîne JSON à déposer dans le stockage.
 */
export function serializeCart(items: readonly CartItem[]): string {
  const payload: StoredCart = {
    version: CART_STORAGE_VERSION,
    items: [...items],
  };
  return JSON.stringify(payload);
}

/**
 * Relit un panier depuis le format de stockage.
 *
 * @param raw - Contenu brut lu dans le stockage.
 * @returns Les lignes exploitables.
 */
export function parseCart(raw: string | null | undefined): CartItem[] {
  if (!isNonEmptyString(raw)) return [];

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }

  if (decoded === null || typeof decoded !== "object") return [];
  const payload = decoded as Record<string, unknown>;

  if (payload.version !== CART_STORAGE_VERSION) return [];
  if (!Array.isArray(payload.items)) return [];

  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const entry of payload.items) {
    const item = parseCartItem(entry);
    if (!item) continue;
    if (seen.has(item.sku)) continue;
    seen.add(item.sku);
    items.push(item);
  }

  return items;
}
