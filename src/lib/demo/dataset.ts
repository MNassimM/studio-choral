/**
 * MOCK / TEMPORAIRE
 *
 * Ce module est la seule source de vérité du catalogue de démonstration :
 * œuvres, mouvements, référentiel des pupitres, et pistes audio de synthèse
 * (aucun enregistrement réel). Il est importé à la fois par la seed Prisma
 * (`prisma/seed.ts`, qui ne contient plus aucune donnée) et par le générateur
 * de fichiers WAV de démonstration (`scripts/generate-demo-audio.ts`), afin
 * que les deux ne puissent jamais diverger. Ajouter une œuvre ou un pupitre
 * de démonstration ne demande d'éditer que ce fichier.
 *
 * En production, les fichiers audio vivront dans un bucket privé et seront
 * servis par URL signée après vérification des droits — `storageKey` n'est
 * jamais une URL.
 */

export const SATB_VOICE_CODES = ["SOPRANO", "ALTO", "TENOR", "BASS"] as const;

export type SatbVoiceCode = (typeof SATB_VOICE_CODES)[number];

export type DemoMovement = {
  slug: string;
  title: string;
  position: number;
  hasAccompaniment: boolean;
};

export type DemoWork = {
  slug: string;
  title: string;
  composer: string;
  catalogueRef: string | null;
  shortDescription: string;
  description: string;
  isPublished: boolean;
  movements: DemoMovement[];
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
    isPublished: true,
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
    isPublished: true,
    movements: [
      {
        slug: "ce-mois-de-mai",
        title: "Ce mois de mai",
        position: 1,
        hasAccompaniment: false,
      },
    ],
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
    isPublished: true,
    movements: [
      {
        slug: "il-est-bel-et-bon",
        title: "Il est bel et bon",
        position: 1,
        hasAccompaniment: false,
      },
    ],
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
    isPublished: true,
    movements: [
      {
        slug: "mille-regretz",
        title: "Mille regretz",
        position: 1,
        hasAccompaniment: false,
      },
    ],
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
