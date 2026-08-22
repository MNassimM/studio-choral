/**
 * Types du domaine des droits d'accès (src/lib/access). Unions de chaînes
 * littérales uniquement - jamais un enum importé du client Prisma généré :
 * ce fichier doit pouvoir être importé par un Client Component sans jamais
 * tirer Prisma dans le bundle navigateur, et son contenu doit rester
 * sérialisable tel quel à travers la frontière Server → Client Component.
 */

export type AccessScope = "MOVEMENT" | "WORK";
export type VoiceCoverage = "SINGLE_VOICE" | "ALL_VOICES";
export type AudioType =
  | "SOLO"
  | "PREDOMINANT"
  | "TUTTI"
  | "ACCOMPANIMENT"
  | "PREVIEW";

/** Ce qu'une piste audio peut permettre de faire, une fois les droits résolus. */
export type Capability = "PREVIEW" | "STREAM" | "STUDIO" | "DOWNLOAD";

/**
 * Le droit qu'un utilisateur détient sur une œuvre - version domaine de
 * LibraryItem (Prisma), sans id ni métadonnées de traçabilité (source,
 * dates de création/révocation...) : lib/access ne calcule qu'à partir de
 * droits déjà considérés actifs (voir src/lib/catalog, qui filtre
 * `revokedAt: null` avant de produire ces Grant).
 *
 * `movementId` est NULL si scope = WORK (le droit couvre l'œuvre entière) ;
 * `voiceCode` est NULL si coverage = ALL_VOICES - mêmes règles que le
 * modèle Prisma d'origine.
 */
export type Grant = {
  workId: string;
  movementId: string | null;
  voiceCode: string | null;
  scope: AccessScope;
  coverage: VoiceCoverage;
};

/** Forme minimale d'un mouvement nécessaire pour résoudre les droits. */
export type MovementAccessInput = {
  id: string;
  /** Pupitres du mouvement, déduits de ses pistes (voiceCode non nul). */
  voiceCodes: string[];
};

/** Forme minimale d'une œuvre nécessaire pour résoudre les droits. */
export type WorkAccessInput = {
  id: string;
  movements: MovementAccessInput[];
};

/** Ce que l'utilisateur possède sur un mouvement donné d'une œuvre. */
export type MovementAccess = {
  unlocked: boolean;
  ownedVoiceCodes: string[];
  tuttiStream: boolean;
  tuttiDownload: boolean;
  studio: boolean;
};

/**
 * Ce que l'utilisateur possède sur une œuvre entière - résultat sérialisable
 * de resolveWorkAccess() (src/lib/access/rules.ts), destiné à traverser la
 * frontière Server Component → Client Component sans dupliquer la logique
 * de résolution côté navigateur.
 */
export type WorkAccess = {
  workId: string;
  ownsAnything: boolean;
  /**
   * Vrai seulement si l'utilisateur possède TOUTES les voix sur TOUS les
   * mouvements (droit « toutes voix - œuvre entière », ou équivalent par
   * cumul de droits plus étroits). Un droit « Alto - œuvre entière »
   * débloque l'alto partout mais NE rend PAS ownsFullWork vrai : il ne
   * possède qu'un seul pupitre, pas l'œuvre complète.
   */
  ownsFullWork: boolean;
  /**
   * Pupitres possédés sur l'œuvre dans son ensemble : l'union des pupitres
   * possédés sur chacun de ses mouvements (dédupliquée). Pour le détail
   * mouvement par mouvement, voir `movements`.
   */
  ownedVoiceCodes: string[];
  unlockedMovementCount: number;
  totalMovementCount: number;
  movements: Record<string, MovementAccess>;
};
