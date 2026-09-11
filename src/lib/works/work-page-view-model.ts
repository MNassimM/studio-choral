import type {
  AccessScope,
  AudioType,
  VoiceCoverage,
  WorkAccess,
  WorkAccessInput,
} from "@/types/domain";
import { canDownload } from "@/lib/access/rules";
import { productToGrant } from "@/lib/catalog/product-grant";
import {
  computeAllVoicesDiscount,
  type AllVoicesCoverage,
} from "@/lib/pricing/all-voices-discount";
import {
  measureCoverage,
  type CoverageCoordinates,
} from "@/lib/pricing/cart-pricing";
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
 * Ce que couvre la ligne toutes voix.
 *
 * @remarks
 * Seulement un nombre de pupitres : cette offre coûte la somme de ses
 * pupitres et ouvre les mêmes droits qu'eux, elle n'ajoute donc rien à
 * annoncer. Elle regroupe un achat, elle ne l'avantage pas.
 */
export type AllVoicesExtraView = {
  voiceCount: number;
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
  /** Mouvements et pupitres de l'oeuvre, déjà dérivés des pistes audio. */
  layout: WorkAccessInput;
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
  layout,
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

  // La dérivation des pupitres vient de buildWorkAccessInput, on ne la refait pas.
  const voiceCodesByMovementId = new Map(
    layout.movements.map((movement) => [movement.id, movement.voiceCodes]),
  );
  const layouts = new Map([[layout.id, layout]]);

  /**
   * Traduit les pupitres possédés en coordonnées, pour mesurer la couverture.
   *
   * @returns Une coordonnée par pupitre possédé sur un mouvement.
   */
  function ownedCoordinates(): CoverageCoordinates[] {
    return layout.movements.flatMap((movement) =>
      (access.movements[movement.id]?.ownedVoiceCodes ?? []).map(
        (voiceCode) => ({
          workId: layout.id,
          movementId: movement.id,
          voiceCode,
          scope: "MOVEMENT" as const,
          coverage: "SINGLE_VOICE" as const,
        }),
      ),
    );
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
    coverage: AllVoicesCoverage,
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
  function movementCoverage(movementId: string): AllVoicesCoverage {
    return measureCoverage(
      {
        workId: layout.id,
        movementId,
        voiceCode: null,
        scope: "MOVEMENT",
        coverage: "ALL_VOICES",
      },
      layouts,
      ownedCoordinates(),
    );
  }

  /**
   * Calcule la couverture possédée sur l'oeuvre entière.
   *
   * @returns Les cellules mouvement fois voix possédées, et le total.
   */
  function workCoverage(): AllVoicesCoverage {
    return measureCoverage(
      {
        workId: layout.id,
        movementId: null,
        voiceCode: null,
        scope: "WORK",
        coverage: "ALL_VOICES",
      },
      layouts,
      ownedCoordinates(),
    );
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
   * Construit ce que couvre la ligne toutes voix.
   *
   * @param siblings - Produits pupitre du même périmètre.
   * @returns Le nombre de voix couvertes, ou null si le lot est vide.
   */
  function buildAllVoicesExtra(
    siblings: TProduct[],
  ): AllVoicesExtraView | null {
    if (siblings.length === 0) return null;

    return { voiceCount: siblings.length };
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
