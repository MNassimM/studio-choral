/**
 * MOCK / TEMPORAIRE
 *
 * Génère des fichiers WAV de synthèse (simples sinusoïdes) dans
 * `public/demo-audio/`, aucun enregistrement réel.
 *
 * Ces fichiers ne sont PLUS décrits en base : la seed n'écrit aucune ligne
 * `AudioFile`. Ils sont nommés selon la convention d'import de la matrice
 * d'administration, `<mouvement>-<pupitre>-<type>.wav`, et s'importent à la
 * main depuis la page de l'oeuvre. Un dossier par oeuvre, pour pouvoir déposer
 * son contenu d'un seul geste.
 *
 * Le mouvement est normalisé, donc sans tiret : le tiret sépare les champs de
 * la convention, « Agnus Dei » devient donc `agnusdei`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEMO_CATALOG,
  SATB_VOICE_CODES,
  type SatbVoiceCode,
} from "../src/lib/demo/dataset";

const SAMPLE_RATE = 22050;
const BITS_PER_SAMPLE = 8;
const OUTPUT_DIR = path.resolve(import.meta.dirname, "../public/demo-audio");

// Une fréquence par pupitre, du plus aigu (soprano) au plus grave (basse).
const VOICE_FREQUENCIES: Record<SatbVoiceCode, number> = {
  SOPRANO: 880,
  ALTO: 660,
  TENOR: 440,
  BASS: 220,
};

/** Une piste à écrire, telle que la convention la nomme. */
type DemoFile = {
  workSlug: string;
  fileName: string;
  voiceCode: SatbVoiceCode | null;
  durationSeconds: number;
};

/**
 * Réduit un texte à sa forme comparable, celle qu'attend la déduction.
 *
 * @param value - Texte d'origine.
 * @returns Minuscules, sans accent ni ponctuation, tirets et blancs retirés.
 */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Énumère les fichiers à générer pour tout le catalogue de démonstration.
 *
 * @returns Un fichier par case attendue de la matrice.
 */
function buildDemoFiles(): DemoFile[] {
  const fichiers: DemoFile[] = [];

  for (const work of DEMO_CATALOG) {
    for (const movement of work.movements) {
      const mvt = normalize(movement.title);

      fichiers.push({
        workSlug: work.slug,
        fileName: `${mvt}-tutti.wav`,
        voiceCode: null,
        durationSeconds: 12,
      });

      for (const voiceCode of SATB_VOICE_CODES) {
        const voix = voiceCode.toLowerCase();
        // Les noms canoniques de l'enum, jamais leurs synonymes : ils seuls
        // valent une correspondance certaine, donc aucune case marquée à
        // vérifier au moment du dépôt.
        fichiers.push({
          workSlug: work.slug,
          fileName: `${mvt}-${voix}-predominant.wav`,
          voiceCode,
          durationSeconds: 12,
        });
        fichiers.push({
          workSlug: work.slug,
          fileName: `${mvt}-${voix}-solo.wav`,
          voiceCode,
          durationSeconds: 12,
        });
        fichiers.push({
          workSlug: work.slug,
          fileName: `${mvt}-${voix}-preview.wav`,
          voiceCode,
          durationSeconds: 6,
        });
      }

      if (movement.hasAccompaniment) {
        fichiers.push({
          workSlug: work.slug,
          fileName: `${mvt}-accompaniment.wav`,
          voiceCode: null,
          durationSeconds: 12,
        });
      }
    }
  }

  return fichiers;
}

/**
 * Rend les fréquences à mélanger pour une piste.
 *
 * @param voiceCode - Pupitre de la piste, nul pour un tutti.
 * @returns Une fréquence par pupitre concerné.
 */
function frequenciesForTrack(voiceCode: SatbVoiceCode | null): number[] {
  if (voiceCode) {
    return [VOICE_FREQUENCIES[voiceCode]];
  }

  // TUTTI et ACCOMPANIMENT n'ont pas de voix propre : mixage des 4 pupitres.
  return SATB_VOICE_CODES.map((code) => VOICE_FREQUENCIES[code]);
}

/**
 * Synthétise un signal en octets, somme des fréquences demandées.
 *
 * @param frequencies - Fréquences à mélanger, en hertz.
 * @param durationSeconds - Durée du signal.
 * @returns Les échantillons, un octet chacun.
 */
function synthesizeSamples(
  frequencies: number[],
  durationSeconds: number,
): Buffer {
  const total = SAMPLE_RATE * durationSeconds;
  const samples = Buffer.alloc(total);

  for (let index = 0; index < total; index += 1) {
    const t = index / SAMPLE_RATE;
    const somme = frequencies.reduce(
      (acc, frequence) => acc + Math.sin(2 * Math.PI * frequence * t),
      0,
    );
    const normalise = somme / frequencies.length;
    samples[index] = Math.round((normalise * 0.5 + 0.5) * 255);
  }

  return samples;
}

/**
 * Emballe des échantillons dans un fichier WAV complet.
 *
 * @param samples - Les échantillons bruts.
 * @returns Le contenu du fichier, en-tête compris.
 */
function buildWavFile(samples: Buffer): Buffer {
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + samples.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * (BITS_PER_SAMPLE / 8), 28);
  header.writeUInt16LE(BITS_PER_SAMPLE / 8, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(samples.length, 40);

  return Buffer.concat([header, samples]);
}

async function main() {
  const fichiers = buildDemoFiles();

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const fichier of fichiers) {
    const samples = synthesizeSamples(
      frequenciesForTrack(fichier.voiceCode),
      fichier.durationSeconds,
    );
    const wav = buildWavFile(samples);

    const dossier = path.join(OUTPUT_DIR, fichier.workSlug);
    await mkdir(dossier, { recursive: true });
    await writeFile(path.join(dossier, fichier.fileName), wav);
  }

  const parOeuvre = new Map<string, number>();
  for (const fichier of fichiers) {
    parOeuvre.set(fichier.workSlug, (parOeuvre.get(fichier.workSlug) ?? 0) + 1);
  }
  for (const [slug, compte] of parOeuvre) {
    console.log(`  ${slug} : ${compte} fichiers`);
  }

  console.log(
    `${fichiers.length} fichiers écrits dans ${OUTPUT_DIR}. ` +
      `À importer par la matrice de la page d'administration, un dossier par œuvre.`,
  );
}

main().catch((error) => {
  console.error("Échec de la génération des fichiers audio :", error);
  process.exit(1);
});
