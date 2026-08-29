/**
 * MOCK / TEMPORAIRE
 */

import type { MusicalPeriod } from "@/generated/prisma/client";

export const SATB_VOICE_CODES = ["SOPRANO", "ALTO", "TENOR", "BASS"] as const;

export type SatbVoiceCode = (typeof SATB_VOICE_CODES)[number];

export type DemoMovement = {
  slug: string;
  title: string;
  position: number;
  hasAccompaniment: boolean;
};

/**
 * MOCK / TEMPORAIRE - tarifs de démonstration, à arbitrer œuvre par œuvre.
 */
export type DemoWorkPricing = {
  movementSingleVoiceCents: number | null;
  movementAllVoicesCents: number | null;
  workSingleVoiceCents: number;
  workAllVoicesCents: number;
};

export type DemoWorkTranslation = {
  locale: string;
  slug: string;
  title: string | null;
  shortDescription: string;
  description: string;
};

export type DemoWork = {
  slug: string;
  title: string;
  composer: string;
  catalogueRef: string | null;
  shortDescription: string;
  description: string;
  composedYear: number | null;
  period: MusicalPeriod | null;
  voicing: string | null;
  language: string | null;
  isPublished: boolean;
  translations: DemoWorkTranslation[];
  movements: DemoMovement[];
  pricing: DemoWorkPricing;
  priceOverrides?: Record<string, number>;
};

/**
 * Catalogue complet de démonstration
 */
export const DEMO_CATALOG: DemoWork[] = [
  {
    slug: "messe-en-sol-majeur",
    title: "Messe en sol majeur",
    composer: "Franz Schubert",
    catalogueRef: "D.167",
    shortDescription:
      "Messe brève et lyrique pour chœur et orchestre, composée par Schubert en 1815.",
    description:
      "Composée par Franz Schubert en 1815, cette messe fait partie de ses premières œuvres liturgiques. Écrite pour chœur mixte et orchestre, elle se distingue par un style mélodique simple et chaleureux. Ses six mouvements suivent l'ordinaire de la messe, du Kyrie à l'Agnus Dei.",
    composedYear: 1815,
    period: "CLASSICAL",
    voicing: "SATB",
    language: "la",
    isPublished: true,
    translations: [
      {
        locale: "en",
        slug: "mass-in-g-major",
        title: "Mass in G major",
        shortDescription:
          "A brief, lyrical mass for choir and orchestra, composed by Schubert in 1815.",
        description:
          "Composed by Franz Schubert in 1815, this mass is among his earliest liturgical works. Written for mixed choir and orchestra, it stands out for its simple, warm melodic style. Its six movements follow the ordinary of the mass, from the Kyrie to the Agnus Dei.",
      },
    ],
    movements: [
      { slug: "kyrie", title: "Kyrie", position: 1, hasAccompaniment: true },
      { slug: "gloria", title: "Gloria", position: 2, hasAccompaniment: true },
      { slug: "credo", title: "Credo", position: 3, hasAccompaniment: true },
      {
        slug: "sanctus",
        title: "Sanctus",
        position: 4,
        hasAccompaniment: true,
      },
      {
        slug: "benedictus",
        title: "Benedictus",
        position: 5,
        hasAccompaniment: true,
      },
      {
        slug: "agnus-dei",
        title: "Agnus Dei",
        position: 6,
        hasAccompaniment: true,
      },
    ],
    pricing: {
      movementSingleVoiceCents: 190,
      movementAllVoicesCents: 390,
      workSingleVoiceCents: 890,
      workAllVoicesCents: 1490,
    },
  },
  {
    slug: "ce-mois-de-mai",
    title: "Ce mois de mai",
    composer: "Clément Janequin",
    catalogueRef: null,
    shortDescription:
      "Chanson polyphonique de la Renaissance française célébrant l'arrivée du printemps.",
    description:
      "Composée par Clément Janequin, cette chanson polyphonique est écrite pour voix mixtes a cappella. Son texte évoque la joie et le renouveau associés au mois de mai. Elle illustre le style vif et descriptif caractéristique du chansonnier français du XVIe siècle.",
    composedYear: null,
    period: "RENAISSANCE",
    voicing: "SATB",
    language: "fr",
    isPublished: true,
    translations: [
      {
        locale: "en",
        slug: "ce-mois-de-mai",
        title: null,
        shortDescription:
          "A Renaissance French polyphonic chanson celebrating the arrival of spring.",
        description:
          "Composed by Clément Janequin, this polyphonic chanson is written for mixed voices a cappella. Its text evokes the joy and renewal associated with the month of May. It illustrates the lively, descriptive style characteristic of the 16th-century French chansonnier.",
      },
    ],
    movements: [
      {
        slug: "ce-mois-de-mai",
        title: "Ce mois de mai",
        position: 1,
        hasAccompaniment: false,
      },
    ],
    pricing: {
      movementSingleVoiceCents: null,
      movementAllVoicesCents: null,
      workSingleVoiceCents: 190,
      workAllVoicesCents: 290,
    },
  },
  {
    slug: "il-est-bel-et-bon",
    title: "Il est bel et bon",
    composer: "Pierre Passereau",
    catalogueRef: null,
    shortDescription:
      "Chanson comique de la Renaissance française, célèbre pour ses imitations de caquètement de poule.",
    description:
      "Composée par Pierre Passereau au XVIe siècle, cette chanson polyphonique à quatre voix met en scène une femme vantant les qualités de son mari. Son caractère enjoué et ses onomatopées imitant le caquètement des poules en ont fait l'une des chansons les plus populaires du répertoire Renaissance. Elle reste aujourd'hui un classique du répertoire choral léger.",
    composedYear: null,
    period: "RENAISSANCE",
    voicing: "SATB",
    language: "fr",
    isPublished: true,
    translations: [
      {
        locale: "en",
        slug: "il-est-bel-et-bon",
        title: null,
        shortDescription:
          "A comic Renaissance French chanson, famous for its imitations of clucking hens.",
        description:
          "Composed by Pierre Passereau in the 16th century, this four-voice polyphonic chanson depicts a woman praising her husband's qualities. Its playful character and onomatopoeic imitations of clucking hens have made it one of the most popular songs of the Renaissance repertoire. It remains a classic of the light choral repertoire today.",
      },
    ],
    movements: [
      {
        slug: "il-est-bel-et-bon",
        title: "Il est bel et bon",
        position: 1,
        hasAccompaniment: false,
      },
    ],
    pricing: {
      movementSingleVoiceCents: null,
      movementAllVoicesCents: null,
      workSingleVoiceCents: 220,
      workAllVoicesCents: 350,
    },
  },
  {
    slug: "mille-regretz",
    title: "Mille regretz",
    composer: "Josquin des Prez",
    catalogueRef: null,
    shortDescription:
      "Chanson mélancolique de la Renaissance sur le thème de la séparation, attribuée à Josquin des Prez.",
    description:
      "Chanson polyphonique à quatre voix attribuée à Josquin des Prez, compositeur majeur de la Renaissance franco-flamande. Son texte exprime la douleur d'une séparation, porté par une écriture harmonique dense et expressive. Elle reste l'une des chansons profanes les plus célèbres et les plus reprises de son époque.",
    composedYear: null,
    period: "RENAISSANCE",
    voicing: "SATB",
    language: "fr",
    isPublished: true,
    translations: [
      {
        locale: "en",
        slug: "mille-regretz",
        title: null,
        shortDescription:
          "A melancholic Renaissance chanson on the theme of parting, attributed to Josquin des Prez.",
        description:
          "A four-voice polyphonic chanson attributed to Josquin des Prez, a major composer of the Franco-Flemish Renaissance. Its text expresses the pain of separation, carried by dense, expressive harmonic writing. It remains one of the most celebrated and widely arranged secular chansons of its time.",
      },
    ],
    movements: [
      {
        slug: "mille-regretz",
        title: "Mille regretz",
        position: 1,
        hasAccompaniment: false,
      },
    ],
    pricing: {
      movementSingleVoiceCents: null,
      movementAllVoicesCents: null,
      workSingleVoiceCents: 250,
      workAllVoicesCents: 390,
    },
  },
];

export type DemoVoice = {
  code: string;
  label: string;
  position: number;
};

export const DEMO_VOICES: DemoVoice[] = [
  { code: "SOPRANO", label: "Soprano", position: 1 },
  { code: "SOPRANO_1", label: "Soprano 1", position: 1 },
  { code: "SOPRANO_2", label: "Soprano 2", position: 2 },
  { code: "ALTO", label: "Alto", position: 3 },
  { code: "ALTO_1", label: "Alto 1", position: 3 },
  { code: "ALTO_2", label: "Alto 2", position: 4 },
  { code: "TENOR", label: "Ténor", position: 5 },
  { code: "TENOR_1", label: "Ténor 1", position: 6 },
  { code: "TENOR_2", label: "Ténor 2", position: 7 },
  { code: "BARITONE", label: "Baryton", position: 8 },
  { code: "BASS", label: "Basse", position: 9 },
];

export type DemoAudioType =
  "TUTTI" | "PREDOMINANT" | "SOLO" | "ACCOMPANIMENT" | "PREVIEW";

export type DemoAudioTrack = {
  workSlug: string;
  movementSlug: string;
  voiceCode: SatbVoiceCode | null;
  type: DemoAudioType;
  storageKey: string;
  durationSeconds: number;
  mimeType: string;
  previewStartSec: number | null;
};

/**
 * Construit la clé de stockage d'un fichier audio.
 *
 * @param workSlug - Slug de l'oeuvre.
 * @param movementSlug - Slug du mouvement.
 * @param fileName - Nom du fichier, extension comprise.
 * @returns La clé de stockage relative.
 */
function buildStorageKey(
  workSlug: string,
  movementSlug: string,
  fileName: string,
): string {
  return `${workSlug}/${movementSlug}/${fileName}`;
}

/**
 * Calcule la liste complète des pistes audio de démonstration attendues.
 *
 * @returns Toutes les pistes attendues par le catalogue de démonstration.
 */
export function buildDemoAudioTracks(): DemoAudioTrack[] {
  const tracks: DemoAudioTrack[] = [];

  for (const work of DEMO_CATALOG) {
    for (const movement of work.movements) {
      const base = { workSlug: work.slug, movementSlug: movement.slug };

      tracks.push({
        ...base,
        voiceCode: null,
        type: "TUTTI",
        storageKey: buildStorageKey(work.slug, movement.slug, "tutti.wav"),
        durationSeconds: 12,
        mimeType: "audio/wav",
        previewStartSec: null,
      });

      for (const voiceCode of SATB_VOICE_CODES) {
        const lower = voiceCode.toLowerCase();

        tracks.push({
          ...base,
          voiceCode,
          type: "PREDOMINANT",
          storageKey: buildStorageKey(
            work.slug,
            movement.slug,
            `${lower}-predominant.wav`,
          ),
          durationSeconds: 12,
          mimeType: "audio/wav",
          previewStartSec: null,
        });

        tracks.push({
          ...base,
          voiceCode,
          type: "SOLO",
          storageKey: buildStorageKey(
            work.slug,
            movement.slug,
            `${lower}-solo.wav`,
          ),
          durationSeconds: 12,
          mimeType: "audio/wav",
          previewStartSec: null,
        });

        tracks.push({
          ...base,
          voiceCode,
          type: "PREVIEW",
          storageKey: buildStorageKey(
            work.slug,
            movement.slug,
            `${lower}-preview.wav`,
          ),
          durationSeconds: 6,
          mimeType: "audio/wav",
          previewStartSec: 0,
        });
      }

      if (movement.hasAccompaniment) {
        tracks.push({
          ...base,
          voiceCode: null,
          type: "ACCOMPANIMENT",
          storageKey: buildStorageKey(
            work.slug,
            movement.slug,
            "accompaniment.wav",
          ),
          durationSeconds: 12,
          mimeType: "audio/wav",
          previewStartSec: null,
        });
      }
    }
  }

  return tracks;
}

const VOICE_LABEL_BY_CODE: Record<SatbVoiceCode, string> = {
  SOPRANO: "Soprano",
  ALTO: "Alto",
  TENOR: "Ténor",
  BASS: "Basse",
};

export type DemoProductScope = "MOVEMENT" | "WORK";
export type DemoProductCoverage = "SINGLE_VOICE" | "ALL_VOICES";

export type DemoProduct = {
  sku: string;
  name: string;
  workSlug: string;
  movementSlug: string | null;
  voiceCode: SatbVoiceCode | null;
  scope: DemoProductScope;
  coverage: DemoProductCoverage;
  priceCents: number;
  currency: string;
  isActive: boolean;
  position: number;
};

/**
 * prix final d'un produit de démonstration.
 */
function resolvePriceCents(
  work: DemoWork,
  sku: string,
  basePriceCents: number | null,
): number | null {
  const override = work.priceOverrides?.[sku];
  return override ?? basePriceCents;
}

/**
 * Garantit qu'un prix a bien été résolu, et échoue sinon.
 *
 * @param sku - Identifiant du produit concerné, repris dans l'erreur.
 * @param priceCents - Prix résolu, éventuellement null.
 * @returns Le prix, garanti non nul.
 * @throws {Error} Si aucun prix n'a pu être résolu pour ce sku.
 */
function requirePriceCents(sku: string, priceCents: number | null): number {
  if (priceCents === null) {
    throw new Error(
      `buildDemoProducts: prix manquant pour le produit "${sku}" - aucune valeur de repli n'est calculée.`,
    );
  }
  return priceCents;
}

/**
 * Calcule la liste complète des produits de démonstration attendus.
 *
 * @returns Tous les produits attendus par le catalogue de démonstration.
 * @throws {Error} Si un prix manque, ou si deux produits partagent un sku.
 */
export function buildDemoProducts(): DemoProduct[] {
  const products: DemoProduct[] = [];
  const seenSkus = new Set<string>();

  /**
   * Ajoute un produit en refusant les sku en double.
   *
   * @param product - Produit à ajouter à la liste.
   * @throws {Error} Si ce sku a déjà été ajouté.
   */
  function addProduct(product: DemoProduct) {
    if (seenSkus.has(product.sku)) {
      throw new Error(`buildDemoProducts: sku en double : "${product.sku}"`);
    }
    seenSkus.add(product.sku);
    products.push(product);
  }

  for (const work of DEMO_CATALOG) {
    let position = 1;

    for (const movement of work.movements) {
      if (work.pricing.movementSingleVoiceCents !== null) {
        for (const voiceCode of SATB_VOICE_CODES) {
          const sku = `${work.slug}:${movement.slug}:${voiceCode.toLowerCase()}`;
          const priceCents = requirePriceCents(
            sku,
            resolvePriceCents(work, sku, work.pricing.movementSingleVoiceCents),
          );

          addProduct({
            sku,
            name: `${VOICE_LABEL_BY_CODE[voiceCode]} - ${movement.title}`,
            workSlug: work.slug,
            movementSlug: movement.slug,
            voiceCode,
            scope: "MOVEMENT",
            coverage: "SINGLE_VOICE",
            priceCents,
            currency: "EUR",
            isActive: true,
            position: position++,
          });
        }
      }

      if (work.pricing.movementAllVoicesCents !== null) {
        const sku = `${work.slug}:${movement.slug}:all`;
        const priceCents = requirePriceCents(
          sku,
          resolvePriceCents(work, sku, work.pricing.movementAllVoicesCents),
        );

        addProduct({
          sku,
          name: `Toutes les voix - ${movement.title}`,
          workSlug: work.slug,
          movementSlug: movement.slug,
          voiceCode: null,
          scope: "MOVEMENT",
          coverage: "ALL_VOICES",
          priceCents,
          currency: "EUR",
          isActive: true,
          position: position++,
        });
      }
    }

    for (const voiceCode of SATB_VOICE_CODES) {
      const sku = `${work.slug}:${voiceCode.toLowerCase()}`;
      const priceCents = requirePriceCents(
        sku,
        resolvePriceCents(work, sku, work.pricing.workSingleVoiceCents),
      );

      addProduct({
        sku,
        name: `${VOICE_LABEL_BY_CODE[voiceCode]} - ${work.title}`,
        workSlug: work.slug,
        movementSlug: null,
        voiceCode,
        scope: "WORK",
        coverage: "SINGLE_VOICE",
        priceCents,
        currency: "EUR",
        isActive: true,
        position: position++,
      });
    }

    const workAllVoicesSku = `${work.slug}:all`;
    const workAllVoicesPriceCents = requirePriceCents(
      workAllVoicesSku,
      resolvePriceCents(
        work,
        workAllVoicesSku,
        work.pricing.workAllVoicesCents,
      ),
    );

    addProduct({
      sku: workAllVoicesSku,
      name: `Toutes les voix - ${work.title}`,
      workSlug: work.slug,
      movementSlug: null,
      voiceCode: null,
      scope: "WORK",
      coverage: "ALL_VOICES",
      priceCents: workAllVoicesPriceCents,
      currency: "EUR",
      isActive: true,
      position: position++,
    });
  }

  return products;
}

export type DemoUserRole = "USER" | "ADMIN";

export type DemoUser = {
  email: string;
  name: string;
  role: DemoUserRole;
};

/**
 * MOCK / TEMPORAIRE - quatre comptes de démonstration
 */
export const DEMO_USERS: DemoUser[] = [
  {
    email: "demo-aucun-achat@butterfly.test",
    name: "Choriste curieux",
    role: "USER",
  },
  {
    email: "demo-alto-partiel@butterfly.test",
    name: "Choriste alto",
    role: "USER",
  },
  {
    email: "demo-oeuvre-complete@butterfly.test",
    name: "Chef de chœur",
    role: "USER",
  },
  {
    email: "demo-multi-oeuvres@butterfly.test",
    name: "Choriste basse",
    role: "USER",
  },
];

export type DemoGrantSource = "PURCHASE" | "MANUAL_GRANT" | "PROMO";

export type DemoLibraryItem = {
  userEmail: string;
  workSlug: string;
  /** NULL si scope = WORK (droit sur l'œuvre entière). */
  movementSlug: string | null;
  /** NULL si coverage = ALL_VOICES. */
  voiceCode: SatbVoiceCode | null;
  scope: DemoProductScope;
  coverage: DemoProductCoverage;
  source: DemoGrantSource;
};

/**
 * MOCK / TEMPORAIRE - droits de démonstration
 */
export const DEMO_LIBRARY_ITEMS: DemoLibraryItem[] = [
  // demo-alto-partiel : pupitre ALTO sur 4 des 6 mouvements de la messe
  ...(["kyrie", "gloria", "credo", "sanctus"] as const).map(
    (movementSlug): DemoLibraryItem => ({
      userEmail: "demo-alto-partiel@butterfly.test",
      workSlug: "messe-en-sol-majeur",
      movementSlug,
      voiceCode: "ALTO",
      scope: "MOVEMENT",
      coverage: "SINGLE_VOICE",
      source: "MANUAL_GRANT",
    }),
  ),
  // demo-oeuvre-complete : toutes les voix, œuvre entière - un seul droit.
  {
    userEmail: "demo-oeuvre-complete@butterfly.test",
    workSlug: "messe-en-sol-majeur",
    movementSlug: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    source: "MANUAL_GRANT",
  },
  // demo-multi-oeuvres : deux œuvres différentes, pour tester la bibli.
  {
    userEmail: "demo-multi-oeuvres@butterfly.test",
    workSlug: "messe-en-sol-majeur",
    movementSlug: null,
    voiceCode: "BASS",
    scope: "WORK",
    coverage: "SINGLE_VOICE",
    source: "MANUAL_GRANT",
  },
  {
    userEmail: "demo-multi-oeuvres@butterfly.test",
    workSlug: "mille-regretz",
    movementSlug: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    source: "MANUAL_GRANT",
  },
];
