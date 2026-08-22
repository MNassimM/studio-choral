import type { AccessScope, AudioType, VoiceCoverage, WorkAccess } from "@/types/domain";
import { canDownload } from "@/lib/access/rules";

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

export type OwnedOfferView = SimpleOfferView & { alreadyOwned: boolean };

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
  workAllVoicesCard: SimpleOfferView | null;
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

  // Toutes les offres du mouvement (déjà possédées comprises, grisées avec un bandeau)
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
    }));
  const workAllVoicesProduct = workScopeProducts.find(
    (product) => product.coverage === "ALL_VOICES",
  );
  const workAllVoicesCard: SimpleOfferView | null = workAllVoicesProduct
    ? {
        sku: workAllVoicesProduct.sku,
        name: composeName(workAllVoicesProduct),
        priceLabel: getPriceLabel(
          workAllVoicesProduct.priceCents,
          workAllVoicesProduct.currency,
        ),
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
