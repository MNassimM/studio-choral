import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_DURATION_SECONDS,
  MIME_BY_EXTENSION,
  requiresVoice,
  trackCellKey,
  validateUpload,
  type UploadCandidate,
} from "@/features/admin/works/domain/audio-upload";
import { MAX_UPLOAD_BYTES } from "@/server/storage/keys";

console.log(
  "▶ src/features/admin/works/domain/audio-upload.ts — validation d'un dépôt : extension, taille, durée, cohérence MIME",
);

/** Un dépôt correct, que chaque cas vient dégrader sur un seul point. */
const VALIDE: UploadCandidate = {
  filename: "kyrie-soprano.wav",
  contentType: "audio/wav",
  sizeBytes: 8_123_456,
  durationSeconds: 187,
};

/** Renvoie le message de refus, en échouant si le dépôt passe. */
function rejectionOf(candidate: UploadCandidate): string {
  const verdict = validateUpload(candidate);
  assert.equal(verdict.ok, false, "ce dépôt aurait dû être refusé");
  return verdict.ok ? "" : verdict.error;
}

test("un dépôt correct passe et donne son extension", () => {
  const verdict = validateUpload(VALIDE);
  assert.equal(verdict.ok, true);
  assert.equal(verdict.ok && verdict.extension, "wav");
});

test("les trois formats audio prévus sont acceptés", () => {
  for (const [extension, types] of Object.entries(MIME_BY_EXTENSION)) {
    const verdict = validateUpload({
      ...VALIDE,
      filename: `piste.${extension}`,
      contentType: types[0],
    });
    assert.equal(verdict.ok, true, `${extension} aurait dû passer`);
  }
});

test("une extension hors liste est refusée", () => {
  assert.match(
    rejectionOf({ ...VALIDE, filename: "virus.exe", contentType: "audio/wav" }),
    /Format non accepté/,
  );
});

test("un fichier sans extension est refusé", () => {
  assert.match(
    rejectionOf({ ...VALIDE, filename: "kyrie" }),
    /Format non accepté/,
  );
});

test("un type non audio est refusé même sous une bonne extension", () => {
  assert.match(
    rejectionOf({ ...VALIDE, contentType: "application/octet-stream" }),
    /ne correspond pas à un fichier wav/,
  );
});

test("un type audio qui ne colle pas à l'extension est refusé", () => {
  assert.match(
    rejectionOf({ ...VALIDE, filename: "piste.mp3", contentType: "audio/wav" }),
    /ne correspond pas à un fichier mp3/,
  );
});

test("le type est comparé sans tenir compte de la casse", () => {
  const verdict = validateUpload({ ...VALIDE, contentType: "AUDIO/WAV" });
  assert.equal(verdict.ok, true);
});

test("une taille au delà de la limite est refusée", () => {
  assert.match(
    rejectionOf({ ...VALIDE, sizeBytes: MAX_UPLOAD_BYTES + 1 }),
    /trop volumineux, la limite est 200 Mo/,
  );
});

test("la taille limite exacte passe encore", () => {
  const verdict = validateUpload({ ...VALIDE, sizeBytes: MAX_UPLOAD_BYTES });
  assert.equal(verdict.ok, true);
});

test("une taille nulle ou négative est refusée", () => {
  assert.match(rejectionOf({ ...VALIDE, sizeBytes: 0 }), /taille du fichier/);
  assert.match(rejectionOf({ ...VALIDE, sizeBytes: -1 }), /taille du fichier/);
});

test("une durée absente ou non entière est refusée", () => {
  assert.match(
    rejectionOf({ ...VALIDE, durationSeconds: 0 }),
    /durée de la piste/,
  );
  assert.match(
    rejectionOf({ ...VALIDE, durationSeconds: 1.5 }),
    /durée de la piste/,
  );
});

test("une durée au delà du plafond est refusée", () => {
  assert.match(
    rejectionOf({ ...VALIDE, durationSeconds: MAX_DURATION_SECONDS + 1 }),
    /durée maximale/,
  );
});

test("seuls les types par pupitre exigent une voix", () => {
  assert.equal(requiresVoice("SOLO"), true);
  assert.equal(requiresVoice("PREDOMINANT"), true);
  assert.equal(requiresVoice("PREVIEW"), true);
  assert.equal(requiresVoice("TUTTI"), false);
  assert.equal(requiresVoice("ACCOMPANIMENT"), false);
});

test("deux cases de la matrice ne se confondent pas", () => {
  const kyrie = "cle-kyrie";
  assert.notEqual(
    trackCellKey(kyrie, "SOPRANO", "SOLO"),
    trackCellKey(kyrie, "SOPRANO", "PREDOMINANT"),
  );
  assert.notEqual(
    trackCellKey(kyrie, "SOPRANO", "SOLO"),
    trackCellKey(kyrie, "ALTO", "SOLO"),
  );
  assert.notEqual(
    trackCellKey(kyrie, null, "TUTTI"),
    trackCellKey("cle-gloria", null, "TUTTI"),
  );
});

test("une case sans pupitre garde une clé stable", () => {
  assert.equal(trackCellKey("cle-kyrie", null, "TUTTI"), "cle-kyrie||TUTTI");
});
