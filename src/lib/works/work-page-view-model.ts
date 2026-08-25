import type { AccessScope, AudioType, VoiceCoverage, WorkAccess } from "@/types/domain";
import { canDownload } from "@/lib/access/rules";
import { computeAllVoicesDiscount } from "@/lib/pricing/all-voices-discount";

/**
 * Types de vue de la page œuvre.
 *
 * @remarks
 * Déplacés tels quels depuis src/app/[locale]/works/[slug]/page.tsx, pour que
 * la page se contente d'assembler du JSX et que tout le calcul vive ici.
 */

/** Pupitre affiché dans le panneau « Votre accès ». */
export type SidebarVoiceView = { code: string; label: string };

/**
 * Types de piste réellement téléchargeables.
 *
 * @remarks
 * L'extrait n'est jamais téléchargeable, voir la boucle qui construit
 * downloadGroups et qui écarte les pistes PREVIEW avant insertion. Le type
 * est resserré pour que ce soit vérifié statiquement, pas seulement promis
 * dans un commentaire.
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

/** Offre affichée sur une carte de pack, dans sa forme la plus simple. */
export type SimpleOfferView = { sku: string; name: string; priceLabel: string };

/**
 * Remise proportionnelle sur un produit couvrant toutes les voix.
 *
 * @remarks
 * Le pourcentage est un entier, à usage d'affichage uniquement, voir
 * src/lib/pricing/all-voices-discount.ts. La couverture est calculée sur
 * l'œuvre entière pour un produit de portée WORK et sur le seul mouvement
 * pour un produit de portée MOVEMENT. Même principe, périmètre différent.
 */
export type AllVoicesDiscountView = {
  percentOff: number;
  originalPriceLabel: string;
  discountedPriceLabel: string;
};

/**
 * Carte du pack toutes voix de l'œuvre entière.
 *
 * @remarks
 * Type dédié plutôt qu'un SimpleOfferView aux champs optionnels : cette offre
 * est unique et affichée hors liste, elle mérite son propre type au lieu
 * d'ajouter un champ nullable à tout le monde.
 */
export type WorkAllVoicesOfferView = SimpleOfferView & {
  /** Nul quand aucune voix n'est encore possédée, donc aucune remise à afficher. */
  discount: AllVoicesDiscountView | null;
};

/**
 * Offre pouvant être déjà possédée, et éventuellement remisée.
 *
 * @remarks
 * Le champ discount est toujours présent mais souvent nul, pour un produit
 * SINGLE_VOICE ou pour un produit toutes voix sans couverture préalable. Ces
 * offres se mélangent dans une même liste, un champ constamment présent est
 * donc plus simple qu'un type distinct par cas.
 */
export type OwnedOfferView = SimpleOfferView & {
  alreadyOwned: boolean;
  discount: AllVoicesDiscountView | null;
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
 *
 * @remarks
 * Volontairement pas les types Prisma générés, pour rester découplé. Même
 * logique que work-access-input.ts.
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
 *
 * @remarks
 * Le type réel côté Prisma est toujours plus riche. TProduct est déduit par
 * TypeScript au site d'appel, ce qui permet de ne jamais importer de type
 * Prisma ici tout en gardant le typage exact chez l'appelant.
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
  /** Titre de l'œuvre déjà résolu dans la langue active, pour nommer un produit de portée WORK. */
  workTitle: string;
  /** Rend le libellé traduit d'un pupitre, ou le code brut si la traduction manque. */
  getVoiceLabel: (code: string) => string;
  /** Rend un prix déjà formaté dans la devise et la locale courantes. */
  getPriceLabel: (priceCents: number, currency: string) => string;
  /** Compose le nom affiché d'un produit à partir du pupitre et de la cible. */
  composeProductName: (voiceLabel: string | null, targetTitle: string) => string;
  /** Vrai si un droit déjà détenu absorbe ce produit, donc si l'offre est déjà possédée. */
  isAlreadyOwned: (product: TProduct) => boolean;
};

/**
 * Ensemble des vues consommées par la page œuvre.
 */
export type WorkPageViewModel = {
  ownedVoiceViews: SidebarVoiceView[];
  lockedVoiceViews: SidebarVoiceView[];
  downloadGroups: MovementDownloadGroup[];
  hasTuttiDownload: boolean;
  hasAccompanimentDownload: boolean;
  defaultDownloadMovementId: string;
  movementOfferGroups: MovementOfferGroup[];
  defaultOfferMovementId: string;
  workSingleVoiceCards: OwnedOfferView[];
  workAllVoicesCard: WorkAllVoicesOfferView | null;
  hasSingleMovement: boolean;
};

/**
 * Construit toutes les vues affichées par la page œuvre.
 *
 * @remarks
 * Fonction pure : aucun import de React, next-intl, next ou du client Prisma.
 * Elle reçoit les données déjà chargées et les fonctions de libellé, de
 * formatage et de composition de nom dont elle a besoin. C'est ce qui la rend
 * testable sans runtime React ni base de données.
 *
 * Les callbacks sont injectés plutôt qu'importés précisément pour ça :
 * importer next-intl ici suffirait à casser cette propriété.
 *
 * @param params - Données chargées, droits résolus et fonctions de mise en forme.
 * @returns Les vues prêtes à être rendues par la page.
 */
export function buildWorkPageViewModel<TProduct extends ViewModelProduct>({
  access,
  voices,
  movements,
  products,
  workTitle,
  getVoiceLabel,
  getPriceLabel,
  composeProductName,
  isAlreadyOwned,
}: WorkPageViewModelParams<TProduct>): WorkPageViewModel {
  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));
  // Voice.label en base est en français et saisi pour l'admin, il n'est jamais
  // affiché tel quel. On préfère la traduction work.voice.* quand le code SATB
  // est connu, avec repli sur le libellé brut pour un pupitre divisé pas
  // encore documenté comme SOPRANO_1.
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

  // Pupitres de l'œuvre entière, pour le panneau « Votre accès ». Ils sont
  // remis dans l'ordre SATB du référentiel plutôt que dans l'ordre de
  // découverte au fil des mouvements.
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
  const lockedVoiceViews: SidebarVoiceView[] = allWorkVoiceCodes
    .filter((code) => !access.ownedVoiceCodes.includes(code))
    .map((code) => ({ code, label: voiceLabelByCode.get(code) ?? code }));

  // Téléchargements, dérivés exclusivement de canDownload(). Les fichiers
  // verrouillés sont inclus volontairement : ils s'affichent grisés et sans
  // URL, pour montrer ce qu'un achat débloquerait.
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
      product.scope === "WORK" ? workTitle : (product.movement?.title ?? workTitle);
    return composeProductName(voiceLabel, targetTitle);
  }

  /**
   * Construit la vue de remise d'un produit couvrant toutes les voix.
   *
   * @remarks
   * TODO webhook Stripe : au moment de facturer, le webhook devra appeler
   * computeAllVoicesDiscount() côté serveur avec la même couverture. Tant que
   * ce n'est pas fait, la remise affichée n'a aucune valeur contraignante.
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
   * @remarks
   * L'intersection est explicite plutôt qu'un simple comptage des voix
   * possédées : un droit pourrait porter un pupitre absent de ce mouvement,
   * et il ne doit pas gonfler la couverture.
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
   * Calcule la couverture possédée sur l'œuvre entière.
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

  // Toutes les offres du mouvement, y compris celles déjà possédées qui
  // s'affichent grisées avec un bandeau. Le produit toutes voix du mouvement
  // porte en plus la remise proportionnelle à ce qui est déjà possédé SUR CE
  // MOUVEMENT, indépendamment du reste de l'œuvre.
  const movementOfferGroups: MovementOfferGroup[] = movements.map((movement) => ({
    movementId: movement.id,
    movementTitle: movement.title,
    fullyOwned: isMovementFullyOwned(movement.id),
    offers: products
      .filter(
        (product) =>
          product.scope === "MOVEMENT" && product.movementId === movement.id,
      )
      .map((product) => ({
        sku: product.sku,
        name: composeName(product),
        priceLabel: getPriceLabel(product.priceCents, product.currency),
        alreadyOwned: isAlreadyOwned(product),
        discount:
          product.coverage === "ALL_VOICES"
            ? buildAllVoicesDiscountView(product, movementCoverage(movement.id))
            : null,
      })),
  }));
  // On ouvre de préférence sur un mouvement pas encore entièrement possédé,
  // celui où l'utilisateur a quelque chose à acheter.
  const defaultOfferMovementId =
    movementOfferGroups.find((group) => !group.fullyOwned)?.movementId ??
    movementOfferGroups[0]?.movementId ??
    "";

  // Offres de portée œuvre entière. Les pupitres déjà possédés restent
  // affichés, grisés avec un bandeau, plutôt que masqués.
  const workScopeProducts = products.filter((product) => product.scope === "WORK");
  const workSingleVoiceCards: OwnedOfferView[] = workScopeProducts
    .filter((product) => product.coverage === "SINGLE_VOICE")
    .map((product) => ({
      sku: product.sku,
      name: composeName(product),
      priceLabel: getPriceLabel(product.priceCents, product.currency),
      alreadyOwned: isAlreadyOwned(product),
      // Un pupitre seul n'est jamais remisé, la remise ne concerne que les
      // packs toutes voix.
      discount: null,
    }));
  const workAllVoicesProduct = workScopeProducts.find(
    (product) => product.coverage === "ALL_VOICES",
  );
  const workAllVoicesCard: WorkAllVoicesOfferView | null = workAllVoicesProduct
    ? {
        sku: workAllVoicesProduct.sku,
        name: composeName(workAllVoicesProduct),
        priceLabel: getPriceLabel(
          workAllVoicesProduct.priceCents,
          workAllVoicesProduct.currency,
        ),
        discount: buildAllVoicesDiscountView(workAllVoicesProduct, workCoverage()),
      }
    : null;

  const hasSingleMovement = movements.length === 1;

  return {
    ownedVoiceViews,
    lockedVoiceViews,
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
