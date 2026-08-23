import type { AccessScope, AudioType, VoiceCoverage, WorkAccess } from "@/types/domain";
import { canDownload } from "@/lib/access/rules";
import { computeAllVoicesDiscount } from "@/lib/pricing/all-voices-discount";

// ─── Types de vue ──────────────────────────────────────────────────────────
// Déplacés tels quels depuis src/app/[locale]/works/[slug]/page.tsx.

export type SidebarVoiceView = { code: string; label: string };

// PREVIEW n'est jamais téléchargeable (voir la boucle qui construit
// downloadGroups : les pistes PREVIEW sont exclues avant insertion) - type
// resserré pour que ce soit vérifié statiquement, pas seulement en commentaire.
export type DownloadableAudioType = Exclude<AudioType, "PREVIEW">;

export type DownloadFileEntry = {
  audioType: DownloadableAudioType;
  voiceLabel: string | null;
  mimeType: string;
  sizeBytes: number | null;
  owned: boolean;
};

export type MovementDownloadGroup = {
  movementId: string;
  movementTitle: string;
  unlocked: boolean;
  entries: DownloadFileEntry[];
};

export type SimpleOfferView = { sku: string; name: string; priceLabel: string };

/**
 * Remise proportionnelle sur un produit ALL_VOICES (scope WORK ou MOVEMENT) -
 * voir src/lib/pricing/all-voices-discount.ts. `percentOff` est un entier à
 * usage d'affichage (pastille) uniquement. Couverture calculée sur l'œuvre
 * entière pour un produit de scope WORK, sur le seul mouvement pour un
 * produit de scope MOVEMENT - même principe, périmètre différent.
 */
export type AllVoicesDiscountView = {
  percentOff: number;
  originalPriceLabel: string;
  discountedPriceLabel: string;
};

// Type dédié plutôt qu'un SimpleOfferView aux champs optionnels : la remise
// ne concerne QUE la carte ALL_VOICES de scope WORK - offre unique, hors
// liste - donc un type à part plutôt qu'un champ nullable sur SimpleOfferView.
export type WorkAllVoicesOfferView = SimpleOfferView & {
  /** `null` = pas de remise (aucune voix déjà possédée) - comportement identique à aujourd'hui. */
  discount: AllVoicesDiscountView | null;
};

// discount est obligatoire (jamais optionnel) mais nul pour les offres non
// concernées (produit SINGLE_VOICE, ou ALL_VOICES sans voix déjà possédée) -
// ces offres se mélangent dans une même liste (workSingleVoiceCards,
// offers d'un MovementOfferGroup), donc un champ toujours présent plutôt
// qu'un type à part par offre.
export type OwnedOfferView = SimpleOfferView & {
  alreadyOwned: boolean;
  discount: AllVoicesDiscountView | null;
};

export type MovementOfferGroup = {
  movementId: string;
  movementTitle: string;
  fullyOwned: boolean;
  offers: OwnedOfferView[];
};

// ─── Formes d'entrée minimales ─────────────────────────────────────────────
// Formes Prisma minimales nécessaires - pas les types générés directement,
// pour rester découplé (même logique que work-access-input.ts).

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

// Contrainte structurelle minimale sur le produit - le type réel (Prisma)
// est toujours plus riche ; TProduct est déduit par TypeScript au site
// d'appel, sans qu'aucun type Prisma ne soit importé ici.
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

export type WorkPageViewModelParams<TProduct extends ViewModelProduct> = {
  access: WorkAccess;
  voices: ViewModelVoice[];
  movements: ViewModelMovement[];
  products: TProduct[];
  /** Titre déjà résolu de l'œuvre (= resolved.title côté page), pour composer le nom d'un produit de scope WORK. */
  workTitle: string;
  /** Libellé traduit d'un pupitre (code -> libellé), ou repli sur le code si non connu - voir isKnownVoiceCode côté appelant. */
  getVoiceLabel: (code: string) => string;
  /** Libellé de prix déjà formaté dans la devise/la locale courante. */
  getPriceLabel: (priceCents: number, currency: string) => string;
  /** Compose le nom affiché d'un produit à partir du libellé de voix (ou null si toutes les voix) et du titre cible (mouvement ou œuvre). */
  composeProductName: (voiceLabel: string | null, targetTitle: string) => string;
  /** Vrai si un droit déjà détenu absorbe ce produit (offre déjà possédée). */
  isAlreadyOwned: (product: TProduct) => boolean;
};

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
 * Fonction PURE : aucun import de React, next-intl, next/*, ni client
 * Prisma. Reçoit les données déjà chargées (voix, mouvements, produits,
 * droits déjà résolus) et les callbacks de libellé/formatage/composition de
 * nom nécessaires, et rend les vues consommées par la page œuvre. C'est ce
 * qui la rend testable sans runtime React ni base de données.
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
  // Voice.label (base) est en français, saisi pour l'admin - jamais affiché
  // tel quel : on préfère la traduction work.voice.* quand le code SATB est
  // connu, repli sur le libellé brut pour un pupitre divisé pas encore
  // documenté (SOPRANO_1...).
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

  // Détermine si l'utilisateur possède tous les pupitres d'un mouvement donné
  function isMovementFullyOwned(movementId: string): boolean {
    const voiceCodes = voiceCodesByMovementId.get(movementId) ?? []; // tous les pupitres du mouvement
    const owned = access.movements[movementId]?.ownedVoiceCodes ?? []; // pupitres possédés par l'utilisateur sur ce mouvement
    return (
      voiceCodes.length > 0 && voiceCodes.every((code) => owned.includes(code)) // vrai si pupitres possédés = pupitres du mouvement
    );
  }

  // --- Pupitres de l'œuvre entière (pour la sidebar « Votre accès ») ---
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

  // --- Téléchargements - dérivés exclusivement de canDownload(), fichiers
  // verrouillés inclus (grisés, sans URL) ---
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

  const defaultDownloadMovementId =
    downloadGroups.find((group) => group.unlocked)?.movementId ??
    downloadGroups[0]?.movementId ??
    "";

  // Construit le nom affiché d'un produit (pupitre ou œuvre complète) pour l'affichage dans les cartes de pack.
  function composeName(product: TProduct): string {
    const voiceLabel = product.voice
      ? (voiceLabelByCode.get(product.voice.code) ?? product.voice.code)
      : null;
    const targetTitle =
      product.scope === "WORK" ? workTitle : (product.movement?.title ?? workTitle);
    return composeProductName(voiceLabel, targetTitle);
  }

  // Remise proportionnelle sur un produit ALL_VOICES, dérivée de la
  // couverture déjà possédée sur le périmètre concerné (prorata des
  // cellules mouvement × voix pour l'œuvre entière, ou des seules voix pour
  // un mouvement donné - voir src/lib/pricing/all-voices-discount.ts).
  // `null` si aucune voix concernée n'est encore possédée (comportement
  // identique à aujourd'hui).
  // TODO(webhook Stripe) : au moment de facturer, le webhook devra appeler
  // computeAllVoicesDiscount() côté serveur avec la même couverture - cette
  // remise affichée n'a aucune valeur contraignante tant que ce n'est pas fait.
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

  // Couverture (cellules mouvement × voix possédées / totales) d'un seul
  // mouvement - pour la remise sur son propre produit ALL_VOICES.
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

  // Couverture (cellules mouvement × voix possédées / totales) de l'œuvre
  // entière - pour la remise sur le produit ALL_VOICES de scope WORK.
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

  // Toutes les offres du mouvement (déjà possédées comprises, grisées avec
  // un bandeau) - le produit ALL_VOICES du mouvement porte en plus la remise
  // proportionnelle à ce que l'utilisateur possède déjà SUR CE MOUVEMENT.
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
  const defaultOfferMovementId =
    movementOfferGroups.find((group) => !group.fullyOwned)?.movementId ??
    movementOfferGroups[0]?.movementId ??
    "";

  // Œuvre complète - toujours les 4 pupitres (déjà possédés compris,affichés grisés avec un bandeau)
  const workScopeProducts = products.filter((product) => product.scope === "WORK");
  const workSingleVoiceCards: OwnedOfferView[] = workScopeProducts
    .filter((product) => product.coverage === "SINGLE_VOICE")
    .map((product) => ({
      sku: product.sku,
      name: composeName(product),
      priceLabel: getPriceLabel(product.priceCents, product.currency),
      alreadyOwned: isAlreadyOwned(product),
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
