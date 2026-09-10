import { requiresVoice, trackCellKey } from "@/lib/admin/audio/audio-upload";
import type { AudioType } from "@/types/domain";

/**
 * Déduction du placement d'un fichier audio depuis son nom.
 *
 * @remarks
 * Convention : mouvement-pupitre-type.extension, séparateur tiret simple.
 * Les types sans pupitre, tutti et accompagnement, s'écrivent en deux champs.
 * Sur une oeuvre à mouvement unique, le préfixe de mouvement est facultatif.
 * Module neutre et pur, ses tests tournent sous node --test.
 */

/** Un mouvement du formulaire, tel que la matrice le connaît. */
export type DeductionMovement = { key: string; title: string };

/** Un pupitre retenu par l'oeuvre. */
export type DeductionVoice = { code: string; label: string };

/** Ce qu'il faut savoir de la matrice pour placer un fichier. */
export type MatrixContext = {
  movements: DeductionMovement[];
  voices: DeductionVoice[];
  hasAccompaniment: boolean;
  /** Clés des cases déjà occupées, au format de trackCellKey. */
  occupied: string[];
};

/** Un fichier placé dans une case. */
export type Placement = {
  filename: string;
  movementKey: string;
  voiceCode: string | null;
  type: AudioType;
  /** Certaine sur une correspondance exacte, probable via un synonyme. */
  confidence: "certain" | "probable";
};

/** Un fichier que rien ne permet de placer. */
export type Rejection = { filename: string; reason: string };

/** Le résultat d'un lot. */
export type BatchDeduction = { placed: Placement[]; rejected: Rejection[] };

/**
 * Synonymes de type, en plus du nom canonique de l'enum.
 */
const TYPE_SYNONYMS: Record<string, AudioType> = {
  solo: "SOLO",
  seule: "SOLO",
  seul: "SOLO",
  voixseule: "SOLO",
  predom: "PREDOMINANT",
  predominant: "PREDOMINANT",
  predominante: "PREDOMINANT",
  dominante: "PREDOMINANT",
  dom: "PREDOMINANT",
  tutti: "TUTTI",
  mix: "TUTTI",
  ensemble: "TUTTI",
  toutes: "TUTTI",
  piano: "ACCOMPANIMENT",
  accomp: "ACCOMPANIMENT",
  accompagnement: "ACCOMPANIMENT",
  orgue: "ACCOMPANIMENT",
  instrumental: "ACCOMPANIMENT",
  apercu: "PREVIEW",
  preview: "PREVIEW",
  extrait: "PREVIEW",
  demo: "PREVIEW",
};

/** Le nom canonique de chaque type, seule forme jugée certaine. */
const CANONICAL_TYPES: Record<string, AudioType> = {
  solo: "SOLO",
  predominant: "PREDOMINANT",
  tutti: "TUTTI",
  accompaniment: "ACCOMPANIMENT",
  preview: "PREVIEW",
};

/**
 * Abréviations de pupitre, par code.
 */
const VOICE_ALIASES: Record<string, string[]> = {
  SOPRANO: ["sop", "s"],
  SOPRANO_1: ["soprano1", "sop1", "s1"],
  SOPRANO_2: ["soprano2", "sop2", "s2"],
  MEZZO: ["mezzosoprano", "mezzo", "mezz", "mz", "ms"],
  COUNTERTENOR: ["countertenor", "contretenor", "ct"],
  ALTO: ["alt", "a"],
  ALTO_1: ["alto1", "alt1", "a1"],
  ALTO_2: ["alto2", "alt2", "a2"],
  COUNTERALTO: ["counteralto", "contrealto", "ca"],
  TENOR: ["ten", "t"],
  TENOR_1: ["tenor1", "ten1", "t1"],
  TENOR_2: ["tenor2", "ten2", "t2"],
  BARITONE: ["baryton", "bar", "br"],
  BASS: ["basse", "b"],
  BASS_1: ["bass1", "basse1", "b1"],
  BASS_2: ["bass2", "basse2", "b2"],
};

/**
 * Réduit un texte à sa forme comparable.
 *
 * @param value - Texte d'origine.
 * @returns Minuscules, sans accent ni ponctuation, tirets et blancs retirés.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Retire l'extension d'un nom de fichier. */
function withoutExtension(filename: string): string {
  const point = filename.lastIndexOf(".");
  return point === -1 ? filename : filename.slice(0, point);
}

/**
 * Construit la table des pupitres reconnaissables, sans ambiguïté.
 *
 * @param voices - Pupitres retenus par l'oeuvre.
 * @returns Chaque forme acceptée vers son code, les ambiguës retirées.
 */
function buildVoiceLookup(voices: DeductionVoice[]): Map<string, string> {
  const compte = new Map<string, Set<string>>();

  /** Enregistre une forme comme désignant ce pupitre. */
  function offrir(forme: string, code: string) {
    const clef = normalize(forme);
    if (clef.length === 0) return;
    compte.set(clef, (compte.get(clef) ?? new Set()).add(code));
  }

  for (const voice of voices) {
    offrir(voice.code, voice.code);
    offrir(voice.label, voice.code);
    for (const alias of VOICE_ALIASES[voice.code] ?? []) {
      offrir(alias, voice.code);
    }
  }

  const table = new Map<string, string>();
  for (const [forme, codes] of compte) {
    // Une forme partagée par deux pupitres retenus ne désigne personne.
    if (codes.size === 1) table.set(forme, [...codes][0]);
  }
  return table;
}

/** Construit la table des mouvements reconnaissables. */
function buildMovementLookup(
  movements: DeductionMovement[],
): Map<string, string> {
  const compte = new Map<string, Set<string>>();
  for (const movement of movements) {
    const clef = normalize(movement.title);
    if (clef.length === 0) continue;
    compte.set(clef, (compte.get(clef) ?? new Set()).add(movement.key));
  }
  const table = new Map<string, string>();
  for (const [forme, cles] of compte) {
    if (cles.size === 1) table.set(forme, [...cles][0]);
  }
  return table;
}

/** Ce qu'une passe a pu tirer d'un nom de fichier. */
type Candidate = {
  movementKey: string;
  voiceCode: string | null;
  type: AudioType;
  confidence: "certain" | "probable";
};

/**
 * Analyse un nom de fichier isolément.
 *
 * @param filename - Le nom, extension comprise.
 * @param context - Mouvements, pupitres et accompagnement de l'oeuvre.
 * @returns Le candidat trouvé, ou le motif du refus.
 */
export function readFilename(
  filename: string,
  context: MatrixContext,
): { ok: true; candidate: Candidate } | { ok: false; reason: string } {
  const champs = withoutExtension(filename)
    .split("-")
    .map((champ) => normalize(champ))
    .filter((champ) => champ.length > 0);

  if (champs.length === 0 || champs.length > 3) {
    return {
      ok: false,
      reason: "nom illisible, attendu mouvement-pupitre-type",
    };
  }

  const brutType = champs[champs.length - 1];
  const typeCertain = CANONICAL_TYPES[brutType];
  const type = typeCertain ?? TYPE_SYNONYMS[brutType];
  if (!type) {
    return { ok: false, reason: `type de piste non reconnu : ${brutType}` };
  }
  if (type === "ACCOMPANIMENT" && !context.hasAccompaniment) {
    return { ok: false, reason: "cette œuvre ne déclare pas d'accompagnement" };
  }

  const voix = buildVoiceLookup(context.voices);
  const mouvements = buildMovementLookup(context.movements);
  const uniqueMovement =
    context.movements.length === 1 ? context.movements[0].key : null;

  const reste = champs.slice(0, -1);
  let movementKey: string | null = null;
  let voiceCode: string | null = null;
  let approche = typeCertain === undefined;

  if (!requiresVoice(type)) {
    // mouvement-type, ou type seul sur une oeuvre à mouvement unique.
    if (reste.length === 0) {
      movementKey = uniqueMovement;
      if (!movementKey) {
        return {
          ok: false,
          reason: "mouvement absent et l'œuvre en a plusieurs",
        };
      }
      approche = true;
    } else if (reste.length === 1) {
      movementKey = mouvements.get(reste[0]) ?? null;
      if (!movementKey) {
        return { ok: false, reason: `mouvement non reconnu : ${reste[0]}` };
      }
    } else {
      return {
        ok: false,
        reason: "trop de champs pour une piste sans pupitre",
      };
    }
  } else {
    if (reste.length === 0) {
      return { ok: false, reason: `une piste ${type} doit nommer son pupitre` };
    }
    const brutVoix = reste[reste.length - 1];
    voiceCode = voix.get(brutVoix) ?? null;
    if (!voiceCode) {
      return {
        ok: false,
        reason: `pupitre non retenu ou inconnu : ${brutVoix}`,
      };
    }
    // Le code exact est certain, toute autre forme reste approchée.
    if (normalize(voiceCode) !== brutVoix) approche = true;

    const avant = reste.slice(0, -1);
    if (avant.length === 0) {
      movementKey = uniqueMovement;
      if (!movementKey) {
        return {
          ok: false,
          reason: "mouvement absent et l'œuvre en a plusieurs",
        };
      }
      approche = true;
    } else {
      movementKey = mouvements.get(avant[0]) ?? null;
      if (!movementKey) {
        return { ok: false, reason: `mouvement non reconnu : ${avant[0]}` };
      }
    }
  }

  return {
    ok: true,
    candidate: {
      movementKey,
      voiceCode,
      type,
      confidence: approche ? "probable" : "certain",
    },
  };
}

/**
 * Place un lot de fichiers dans la matrice.
 *
 * @remarks
 * Les correspondances certaines sont posées EN PREMIER, sinon un fichier flou
 * occuperait la case d'un fichier exact. Une case déjà prise n'est jamais
 * écrasée, le second candidat part en non associés.
 *
 * @param filenames - Les noms déposés.
 * @param context - Mouvements, pupitres, accompagnement et cases occupées.
 * @returns Les placements retenus et les refus motivés.
 */
export function deduceFilenames(
  filenames: string[],
  context: MatrixContext,
): BatchDeduction {
  const lus = filenames.map((filename) => ({
    filename,
    lecture: readFilename(filename, context),
  }));

  const prises = new Set(context.occupied);
  const placed: Placement[] = [];
  const rejected: Rejection[] = [];

  for (const niveau of ["certain", "probable"] as const) {
    for (const { filename, lecture } of lus) {
      if (!lecture.ok || lecture.candidate.confidence !== niveau) continue;
      const { movementKey, voiceCode, type } = lecture.candidate;
      const cellule = trackCellKey(movementKey, voiceCode, type);
      if (prises.has(cellule)) {
        rejected.push({ filename, reason: "cette case est déjà occupée" });
        continue;
      }
      prises.add(cellule);
      placed.push({
        filename,
        movementKey,
        voiceCode,
        type,
        confidence: niveau,
      });
    }
  }

  for (const { filename, lecture } of lus) {
    if (!lecture.ok) rejected.push({ filename, reason: lecture.reason });
  }

  return { placed, rejected };
}
