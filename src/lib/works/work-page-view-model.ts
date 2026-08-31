import type {
  AccessScope,
  AudioType,
  VoiceCoverage,
  WorkAccess,
} from "@/types/domain";
import { canDownload } from "@/lib/access/rules";
import { productToGrant } from "@/lib/catalog/product-grant";
import {
  computeAllVoicesDiscount,
  computeAllVoicesSaving,
} from "@/lib/pricing/all-voices-discount";
import type { CartItemInput } from "@/lib/cart/types";

/**
 * Types de vue de la page oeuvre.
 */

/** Pupitre affiché dans le panneau "Votre accès". */
export type SidebarVoiceView = { code: string; label: string };

/**
 * Types de piste réellement téléchargeables.
 */
export type DownloadableAudioType = Exclude<AudioType, "PREVIEW">;

/** Une ligne de la grille de téléchargements, verrouillée ou non. */
export type DownloadFileEntry = {
  audioType: DownloadableAudioType;
  voiceLabel: string | null;
  mimeType: string;
  sizeBytes: number | null;
  owned: boolean;
};

/** Les téléchargements d'un mouvement, regroupés pour le sélecteur. */
export type MovementDownloadGroup = {
  movementId: string;
  movementTitle: string;
  unlocked: boolean;
  entries: DownloadFileEntry[];
};

/**
 * Offre affichée sur une card de pack, dans sa forme la plus simple.
 */
export type SimpleOfferView = CartItemInput & {
  name: string;
  /** Libellé du pupitre seul, nul pour une offre toutes voix. */
  voiceLabel: string | null;
  priceLabel: string;
  priceCents: number;
  currency: string;
};

/**
 * Remise proportionnelle sur un produit couvrant toutes les voix.
 */
export type AllVoicesDiscountView = {
  percentOff: number;
  originalPriceLabel: string;
  discountedPriceLabel: string;
};

/**
 * Ce que la ligne toutes voix ajoute par rapport aux pupitres.
 */
export type AllVoicesExtraView = {
  voiceCount: number;
  /** Nul quand le pack ne fait économiser rien. */
  savingLabel: string | null;
};

/**
 * Offre pouvant être déjà possédée, et éventuellement remisée.
 */
export type OwnedOfferView = SimpleOfferView & {
  alreadyOwned: boolean;
  discount: AllVoicesDiscountView | null;
  /** Renseigné seulement pour l'offre toutes voix. */
  allVoices: AllVoicesExtraView | null;
};

/** Les offres d'un mouvement, regroupées pour le sélecteur. */
export type MovementOfferGroup = {
  movementId: string;
  movementTitle: string;
  fullyOwned: boolean;
  offers: OwnedOfferView[];
};

/**
 * Formes d'entrée minimales attendues par le view model.
 */

export type ViewModelVoice = {
  id: string;
  code: string;
};

export type ViewModelAudioTrack = {
  type: AudioType;
  voiceId: string | null;
  mimeType: string;
  sizeBytes: number | null;
};

export type ViewModelMovement = {
  id: string;
  title: string;
  audioFiles: ViewModelAudioTrack[];
};

/**
 * Contrainte structurelle minimale sur un produit.
 */
export type ViewModelProduct = {
  sku: string;
  scope: AccessScope;
  coverage: VoiceCoverage;
  movementId: string | null;
  priceCents: number;
  currency: string;
  voice: { code: string } | null;
  movement: { title: string } | null;
};

/**
 * Tout ce dont le view model a besoin, données et fonctions de mise en forme.
 */
export type WorkPageViewModelParams<TProduct extends ViewModelProduct> = {
  access: WorkAccess;
  voices: ViewModelVoice[];
  movements: ViewModelMovement[];
  products: TProduct[];
  workTitle: string;
  /** Identifiant de l'œuvre, reporté dans les coordonnées de chaque offre. */
  workId: string;
  /** Rend le libellé traduit d'un pupitre, ou le code brut si la traduction manque. */
  getVoiceLabel: (code: string) => string;
  /** Rend un prix déjà formaté dans la devise et la locale courantes. */
  getPriceLabel: (priceCents: number, currency: string) => string;
  /** Compose le nom affiché d'un produit à partir du pupitre et de la cible. */
  composeProductName: (
    voiceLabel: string | null,
    targetTitle: string,
  ) => string;
  /** Vrai si un droit déjà détenu absorbe ce produit, donc si l'offre est déjà possédée. */
  isAlreadyOwned: (product: TProduct) => boolean;
};

/**
 * Ensemble des vues consommées par la page oeuvre.
 */
export type WorkPageViewModel = {
  ownedVoiceViews: SidebarVoiceView[];
  downloadGroups: MovementDownloadGroup[];
  hasTuttiDownload: boolean;
  hasAccompanimentDownload: boolean;
  defaultDownloadMovementId: string;
  movementOfferGroups: MovementOfferGroup[];
  defaultOfferMovementId: string;
  workSingleVoiceCards: OwnedOfferView[];
  workAllVoicesCard: OwnedOfferView | null;
  hasSingleMovement: boolean;
};

/**
 * Construit toutes les vues affichées par la page œuvre.
 *
 * @param params - Données chargées, droits résolus et fonctions de mise en forme.
 * @returns Les vues prêtes à être rendues par la page.
 */
export function buildWorkPageViewModel<TProduct extends ViewModelProduct>({
  access,
  voices,
  movements,
  products,
  workId,
  workTitle,
  getVoiceLabel,
  getPriceLabel,
  composeProductName,
  isAlreadyOwned,
}: WorkPageViewModelParams<TProduct>): WorkPageViewModel {
  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));
  const voiceLabelByCode = new Map(
    voices.map((voice) => [voice.code, getVoiceLabel(voice.code)]),
  );
  const voiceOrderByCode = new Map(
    voices.map((voice, index) => [voice.code, index]),
  );

  const voiceCodesByMovementId = new Map<string, string[]>();
  for (const movement of movements) {
    const codes = new Set<string>();
    for (const track of movement.audioFiles) {
      if (track.voiceId) {
        const code = voiceCodeById.get(track.voiceId);
        if (code) codes.add(code);
      }
    }
    voiceCodesByMovementId.set(movement.id, Array.from(codes));
  }

  /**
   * Indique si l'utilisateur possède tous les pupitres d'un mouvement.
   *
   * @param movementId - Mouvement à examiner.
   * @returns Vrai si aucun pupitre du mouvement ne manque.
   */
  function isMovementFullyOwned(movementId: string): boolean {
    const voiceCodes = voiceCodesByMovementId.get(movementId) ?? [];
    const owned = access.movements[movementId]?.ownedVoiceCodes ?? [];
    return (
      voiceCodes.length > 0 && voiceCodes.every((code) => owned.includes(code))
    );
  }

  // Pupitres de l'œuvre entière, pour le panneau "Votre accès"
  const allWorkVoiceCodesSet = new Set<string>();
  for (const codes of voiceCodesByMovementId.values()) {
    for (const code of codes) allWorkVoiceCodesSet.add(code);
  }
  const allWorkVoiceCodes = Array.from(allWorkVoiceCodesSet).sort(
    (a, b) => (voiceOrderByCode.get(a) ?? 0) - (voiceOrderByCode.get(b) ?? 0),
  );
  const ownedVoiceViews: SidebarVoiceView[] = allWorkVoiceCodes
    .filter((code) => access.ownedVoiceCodes.includes(code))
    .map((code) => ({ code, label: voiceLabelByCode.get(code) ?? code }));

  // Téléchargements, dérivés exclusivement de canDownload()
  const downloadGroups: MovementDownloadGroup[] = movements.map((movement) => {
    const entries: DownloadFileEntry[] = [];
    for (const track of movement.audioFiles) {
      if (track.type === "PREVIEW") continue;
      if (track.type === "SOLO") continue;
      const voiceCode = track.voiceId
        ? (voiceCodeById.get(track.voiceId) ?? null)
        : null;
      const owned = canDownload(access, {
        movementId: movement.id,
        type: track.type,
        voiceCode,
      });
      entries.push({
        audioType: track.type,
        voiceLabel: voiceCode
          ? (voiceLabelByCode.get(voiceCode) ?? voiceCode)
          : null,
        mimeType: track.mimeType,
        sizeBytes: track.sizeBytes,
        owned,
      });
    }
    return {
      movementId: movement.id,
      movementTitle: movement.title,
      unlocked: access.movements[movement.id].unlocked,
      entries,
    };
  });

  const hasTuttiDownload = downloadGroups.some((group) =>
    group.entries.some((entry) => entry.audioType === "TUTTI" && entry.owned),
  );
  const hasAccompanimentDownload = downloadGroups.some((group) =>
    group.entries.some(
      (entry) => entry.audioType === "ACCOMPANIMENT" && entry.owned,
    ),
  );

  // On ouvre par défaut sur un mouvement débloqué, à défaut sur le premier.
  // La chaîne vide ne survient que si l'œuvre n'a aucun mouvement.
  const defaultDownloadMovementId =
    downloadGroups.find((group) => group.unlocked)?.movementId ??
    downloadGroups[0]?.movementId ??
    "";

  /**
   * Compose le nom affiché d'un produit pour sa carte de pack.
   *
   * @param product - Produit à nommer.
   * @returns Le nom composé à partir du pupitre et de la cible.
   */
  function composeName(product: TProduct): string {
    const voiceLabel = product.voice
      ? (voiceLabelByCode.get(product.voice.code) ?? product.voice.code)
      : null;
    const targetTitle =
      product.scope === "WORK"
        ? workTitle
        : (product.movement?.title ?? workTitle);
    return composeProductName(voiceLabel, targetTitle);
  }

  /**
   * Construit la vue de remise d'un produit couvrant toutes les voix.
   *
   * @remarks
   * TODO webhook Stripe. Au moment de facturer, le webhook devra appeler computeAllVoicesDiscount() côté serveur
   * avec la même couverture.
   *
   * @param product - Produit toutes voix concerné.
   * @param coverage - Cellules possédées et totales sur le périmètre du produit.
   * @returns La vue de remise, ou null si rien n'est encore possédé.
   */
  function buildAllVoicesDiscountView(
    product: TProduct,
    coverage: { ownedUnits: number; totalUnits: number },
  ): AllVoicesDiscountView | null {
    if (coverage.ownedUnits === 0 || coverage.totalUnits === 0) return null;

    const { percentOff, discountedCents } = computeAllVoicesDiscount(
      coverage,
      product.priceCents,
    );
    return {
      percentOff,
      originalPriceLabel: getPriceLabel(product.priceCents, product.currency),
      discountedPriceLabel: getPriceLabel(discountedCents, product.currency),
    };
  }

  /**
   * Calcule la couverture possédée sur un seul mouvement.
   *
   * @param movementId - Mouvement à mesurer.
   * @returns Les cellules possédées et le total du mouvement.
   */
  function movementCoverage(movementId: string): {
    ownedUnits: number;
    totalUnits: number;
  } {
    const voiceCodes = voiceCodesByMovementId.get(movementId) ?? [];
    const owned = access.movements[movementId]?.ownedVoiceCodes ?? [];
    return {
      totalUnits: voiceCodes.length,
      ownedUnits: voiceCodes.filter((code) => owned.includes(code)).length,
    };
  }

  /**
   * Calcule la couverture possédée sur l'oeuvre entière.
   *
   * @returns Les cellules mouvement fois voix possédées, et le total.
   */
  function workCoverage(): { ownedUnits: number; totalUnits: number } {
    let ownedUnits = 0;
    let totalUnits = 0;
    for (const [movementId, voiceCodes] of voiceCodesByMovementId) {
      totalUnits += voiceCodes.length;
      const owned = access.movements[movementId]?.ownedVoiceCodes ?? [];
      ownedUnits += voiceCodes.filter((code) => owned.includes(code)).length;
    }
    return { ownedUnits, totalUnits };
  }

  /**
   * Construit la partie commune d'une vue d'offre.
   *
   * @param product - Produit à représenter.
   * @returns La référence, les coordonnées d'accès et l'affichage.
   */
  function buildSimpleOffer(product: TProduct): SimpleOfferView {
    return {
      sku: product.sku,
      ...productToGrant(workId, product),
      name: composeName(product),
      voiceLabel: product.voice
        ? (voiceLabelByCode.get(product.voice.code) ?? product.voice.code)
        : null,
      priceLabel: getPriceLabel(product.priceCents, product.currency),
      priceCents: product.priceCents,
      currency: product.currency,
    };
  }

  /**
   * Construit ce que la ligne toutes voix ajoute face aux pupitres du lot.
   *
   * @param product - Produit toutes voix.
   * @param siblings - Produits pupitre du même périmètre.
   * @returns Le nombre de voix et l'économie, ou null si le lot est vide.
   */
  function buildAllVoicesExtra(
    product: TProduct,
    siblings: TProduct[],
  ): AllVoicesExtraView | null {
    if (siblings.length === 0) return null;

    const saving = computeAllVoicesSaving(
      siblings.map((sibling) => sibling.priceCents),
      product.priceCents,
    );
    return {
      voiceCount: siblings.length,
      savingLabel: saving > 0 ? getPriceLabel(saving, product.currency) : null,
    };
  }

  // Toutes les offres du mouvement, y compris celles déjà possédées qui s'affichent grisées avec un bandeau.
  const movementOfferGroups: MovementOfferGroup[] = movements.map(
    (movement) => ({
      movementId: movement.id,
      movementTitle: movement.title,
      fullyOwned: isMovementFullyOwned(movement.id),
      offers: products
        .filter(
          (product) =>
            product.scope === "MOVEMENT" && product.movementId === movement.id,
        )
        .map((product) => ({
          ...buildSimpleOffer(product),
          alreadyOwned: isAlreadyOwned(product),
          discount:
            product.coverage === "ALL_VOICES"
              ? buildAllVoicesDiscountView(
                  product,
                  movementCoverage(movement.id),
                )
              : null,
          allVoices:
            product.coverage === "ALL_VOICES"
              ? buildAllVoicesExtra(
                  product,
                  products.filter(
                    (sibling) =>
                      sibling.scope === "MOVEMENT" &&
                      sibling.movementId === movement.id &&
                      sibling.coverage === "SINGLE_VOICE",
                  ),
                )
              : null,
        })),
    }),
  );
  const defaultOfferMovementId =
    movementOfferGroups.find((group) => !group.fullyOwned)?.movementId ??
    movementOfferGroups[0]?.movementId ??
    "";

  // Offres de portée oeuvre entière
  const workScopeProducts = products.filter(
    (product) => product.scope === "WORK",
  );
  const workSingleVoiceCards: OwnedOfferView[] = workScopeProducts
    .filter((product) => product.coverage === "SINGLE_VOICE")
    .map((product) => ({
      ...buildSimpleOffer(product),
      alreadyOwned: isAlreadyOwned(product),
      discount: null,
      allVoices: null,
    }));
  const workAllVoicesProduct = workScopeProducts.find(
    (product) => product.coverage === "ALL_VOICES",
  );
  const workAllVoicesCard: OwnedOfferView | null = workAllVoicesProduct
    ? {
        ...buildSimpleOffer(workAllVoicesProduct),
        alreadyOwned: isAlreadyOwned(workAllVoicesProduct),
        discount: buildAllVoicesDiscountView(
          workAllVoicesProduct,
          workCoverage(),
        ),
        allVoices: buildAllVoicesExtra(
          workAllVoicesProduct,
          workScopeProducts.filter(
            (product) => product.coverage === "SINGLE_VOICE",
          ),
        ),
      }
    : null;

  const hasSingleMovement = movements.length === 1;

  return {
    ownedVoiceViews,
    downloadGroups,
    hasTuttiDownload,
    hasAccompanimentDownload,
    defaultDownloadMovementId,
    movementOfferGroups,
    defaultOfferMovementId,
    workSingleVoiceCards,
    workAllVoicesCard,
    hasSingleMovement,
  };
}
