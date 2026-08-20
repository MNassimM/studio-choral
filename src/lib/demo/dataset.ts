/**
 * MOCK / TEMPORAIRE
 *
 * Ce module est la seule source de vérité du catalogue de démonstration :
 * œuvres, mouvements, référentiel des pupitres, pistes audio de synthèse
 * (aucun enregistrement réel) et produits commerciaux (offres achetables,
 * avec leurs tarifs de démonstration — voir la section "pricing" ci-dessous).
 * Il est importé par la seed Prisma (`prisma/seed.ts`, qui ne contient plus
 * aucune donnée), par le générateur de fichiers WAV de démonstration
 * (`scripts/generate-demo-audio.ts`) et par `buildDemoProducts()`, afin que
 * ces éléments ne puissent jamais diverger. Ajouter une œuvre ou un pupitre
 * de démonstration ne demande d'éditer que ce fichier.
 *
 * Tout produit doit passer par `src/lib/products/invariants.ts` avant
 * insertion en base.
 *
 * En production, les fichiers audio vivront dans un bucket privé et seront
 * servis par URL signée après vérification des droits — `storageKey` n'est
 * jamais une URL.
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
 * MOCK / TEMPORAIRE — tarifs de démonstration, à arbitrer œuvre par œuvre.
 *
 * Pas de grille commune : chaque œuvre déclare ses propres montants, à côté
 * de son propre catalogue de mouvements, dans son entrée `DEMO_CATALOG`.
 * `movementSingleVoiceCents`/`movementAllVoicesCents` valent `null` pour une
 * œuvre à un seul mouvement — cela empêche `buildDemoProducts()` de générer
 * des offres de scope MOVEMENT strictement identiques (et concurrentes en
 * prix) aux offres de scope WORK de la même œuvre.
 */
export type DemoWorkPricing = {
  movementSingleVoiceCents: number | null;
  movementAllVoicesCents: number | null;
  workSingleVoiceCents: number;
  workAllVoicesCents: number;
};

/**
 * Surcharge par langue d'une œuvre (voir model WorkTranslation). `title` null
 * signifie « conserver le titre original » (cas des incipits, qui ne se
 * traduisent jamais) — jamais une traduction manquante à combler.
 */
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
  /**
   * Année de composition, approximative pour l'ancien répertoire. `null` si
   * aucune date fiable n'est établie — ne jamais deviner une valeur.
   */
  composedYear: number | null;
  /** Courant musical. `null` si l'œuvre est en cours de catalogage. */
  period: MusicalPeriod | null;
  /**
   * Formation vocale saisie à la main (voir src/lib/works/voicing.ts) —
   * jamais déduite des AudioFile de l'œuvre.
   */
  voicing: string | null;
  /**
   * Langue du texte chanté (code ISO 639-1, voir src/lib/works/languages.ts)
   * — sans rapport avec la langue d'interface du site.
   */
  language: string | null;
  isPublished: boolean;
  translations: DemoWorkTranslation[];
  movements: DemoMovement[];
  pricing: DemoWorkPricing;
  /**
   * Surcharge ponctuelle d'un prix pour un produit précis de cette œuvre,
   * indexée par sku (ex. un Kyrie plus court vendu moins cher que les autres
   * mouvements). Absente ou vide : tous les produits de l'œuvre utilisent
   * les montants de `pricing`. N'affecte qu'un sku à la fois — ce n'est pas
   * une seconde grille de prix.
   */
  priceOverrides?: Record<string, number>;
};

/**
 * Catalogue complet de démonstration : chaque entrée porte l'œuvre entière
 * (métadonnées éditoriales et mouvements ensemble).
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
    // Schubert est à la charnière classique/romantique ; CLASSICAL retenu au
    // vu de la date de composition (1815). Choix arbitrable — signalé à
    // l'utilisateur en fin de tâche.
    period: "CLASSICAL",
    voicing: "SATB",
    // Texte de l'ordinaire de la messe (Kyrie, Gloria, Credo...) : latin.
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
        // Incipit : jamais traduit, y compris dans le slug.
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

/**
 * Référentiel des pupitres de démonstration. Pupitres SATB utilisés par les
 * œuvres du catalogue (positions 1, 3, 5, 9), plus les pupitres divisés pour
 * les effectifs autres que SATB, pas encore utilisés par aucune œuvre.
 * Position : ordre du plus aigu au plus grave. SOPRANO/SOPRANO_1 et
 * ALTO/ALTO_1 partagent la même position car un pupitre non divisé occupe le
 * même registre que le premier de ses pupitres divisés — ce ne sont pas deux
 * rangs distincts, juste deux façons d'organiser la même tessiture.
 */
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

function buildStorageKey(
  workSlug: string,
  movementSlug: string,
  fileName: string,
): string {
  return `${workSlug}/${movementSlug}/${fileName}`;
}

/**
 * Calcule la liste complète des pistes audio de démonstration attendues :
 * 1 TUTTI + 4 PREDOMINANT + 4 SOLO + 4 PREVIEW par mouvement, plus 1
 * ACCOMPANIMENT pour les mouvements marqués `hasAccompaniment`.
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
 * Résout le prix final d'un sku : la surcharge ponctuelle de l'œuvre
 * (`priceOverrides`) l'emporte si elle existe, sinon le montant de base issu
 * de `pricing`. Ne calcule jamais un prix à partir d'un autre.
 */
function resolvePriceCents(
  work: DemoWork,
  sku: string,
  basePriceCents: number | null,
): number | null {
  const override = work.priceOverrides?.[sku];
  return override ?? basePriceCents;
}

function requirePriceCents(sku: string, priceCents: number | null): number {
  if (priceCents === null) {
    throw new Error(
      `buildDemoProducts: prix manquant pour le produit "${sku}" — aucune valeur de repli n'est calculée.`,
    );
  }
  return priceCents;
}

/**
 * Calcule la liste complète des produits de démonstration attendus, à partir
 * du `pricing` (et de l'éventuel `priceOverrides`) propre à chaque œuvre de
 * `DEMO_CATALOG`. Pour chaque œuvre :
 *   - un produit MOVEMENT + SINGLE_VOICE par (mouvement, pupitre SATB) et un
 *     produit MOVEMENT + ALL_VOICES par mouvement, uniquement si les prix
 *     "movement*" de l'œuvre sont renseignés (jamais pour une œuvre à un seul
 *     mouvement, dont les prix movement* valent null) ;
 *   - toujours un produit WORK + SINGLE_VOICE par pupitre SATB et un produit
 *     WORK + ALL_VOICES pour l'œuvre entière.
 */
export function buildDemoProducts(): DemoProduct[] {
  const products: DemoProduct[] = [];
  const seenSkus = new Set<string>();

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
            name: `${VOICE_LABEL_BY_CODE[voiceCode]} — ${movement.title}`,
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
          name: `Toutes les voix — ${movement.title}`,
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
        name: `${VOICE_LABEL_BY_CODE[voiceCode]} — ${work.title}`,
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
      name: `Toutes les voix — ${work.title}`,
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
