/**
 * MOCK / TEMPORAIRE
 *
 * Génère des fichiers WAV de synthèse (simples sinusoïdes) dans
 * `public/demo-audio/`, aucun enregistrement réel. Les `storageKey` écrits ici
 * sont calculés depuis la même source de vérité que la seed Prisma
 * (`src/lib/demo/dataset.ts`), pour garantir qu'ils correspondent exactement
 * aux lignes `AudioFile` créées en base.
 *
 * En production, ces fichiers vivront dans un bucket privé et seront servis
 * par URL signée après vérification des droits.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildDemoAudioTracks,
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

function frequenciesForTrack(voiceCode: SatbVoiceCode | null): number[] {
  if (voiceCode) {
    return [VOICE_FREQUENCIES[voiceCode]];
  }

  // TUTTI et ACCOMPANIMENT n'ont pas de voix propre : mixage des 4 pupitres.
  return SATB_VOICE_CODES.map((code) => VOICE_FREQUENCIES[code]);
}

function synthesizeSamples(
  frequencies: number[],
  durationSeconds: number,
): Buffer {
  const numSamples = Math.round(durationSeconds * SAMPLE_RATE);
  const samples = Buffer.alloc(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Somme des sinusoïdes des pupitres, normalisée par leur nombre pour
    // rester dans l'intervalle [-1, 1] (évite l'écrêtage quand plusieurs
    // fréquences s'additionnent, notamment pour TUTTI/ACCOMPANIMENT).
    const mix =
      frequencies.reduce(
        (sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * t),
        0,
      ) / frequencies.length;

    const amplitude = 0.8 * mix; // marge pour éviter l'écrêtage en crête

    // PCM 8 bits WAV : échantillons non signés, 128 = silence.
    samples[i] = Math.round((amplitude + 1) * 127.5);
  }

  return samples;
}

function buildWavFile(samples: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * (BITS_PER_SAMPLE / 8);
  const blockAlign = BITS_PER_SAMPLE / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + samples.length, 4);
  header.write("WAVE", 8, "ascii");

  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // taille du sous-bloc fmt (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat = PCM
  header.writeUInt16LE(1, 22); // NumChannels = mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);

  header.write("data", 36, "ascii");
  header.writeUInt32LE(samples.length, 40);

  return Buffer.concat([header, samples]);
}

async function main() {
  const tracks = buildDemoAudioTracks();

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const track of tracks) {
    const frequencies = frequenciesForTrack(track.voiceCode);
    const samples = synthesizeSamples(frequencies, track.durationSeconds);
    const wav = buildWavFile(samples);

    const filePath = path.join(OUTPUT_DIR, track.storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, wav);

    console.log(`  écrit : ${track.storageKey} (${wav.length} octets)`);
  }

  console.log(
    `${tracks.length} fichiers audio de démonstration générés dans ${OUTPUT_DIR}`,
  );
}

main().catch((error) => {
  console.error("Échec de la génération des fichiers audio :", error);
  process.exit(1);
});
