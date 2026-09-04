import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  PENDING_PREFIX,
  buildDownloadFilename,
  buildPendingKey,
  buildTrackKey,
  extensionOf,
  isPendingKey,
  isValidKey,
  sanitizeSegment,
} from "@/lib/storage/keys";

// Identifiants de base d'une piste de la Messe, tels qu'ils existent vraiment.
const WORK_ID = "cmsxmdiga0004wc3bdplkj77t";
const MOVEMENT_ID = "cmsxmdign0005wc3bm6jxoj1p";

test("la clé définitive ne contient que des identifiants de base", () => {
  const key = buildTrackKey({
    workId: WORK_ID,
    movementId: MOVEMENT_ID,
    type: "SOLO",
    voiceCode: "SOPRANO",
    extension: "wav",
  });

  assert.equal(
    key,
    `works/${WORK_ID}/movements/${MOVEMENT_ID}/SOLO/soprano.wav`,
  );
});

test("une piste sans pupitre se range sous tutti", () => {
  const key = buildTrackKey({
    workId: WORK_ID,
    movementId: MOVEMENT_ID,
    type: "TUTTI",
    voiceCode: null,
    extension: "mp3",
  });

  assert.equal(
    key,
    `works/${WORK_ID}/movements/${MOVEMENT_ID}/TUTTI/tutti.mp3`,
  );
});

test("le type de piste distingue deux fichiers d'un même pupitre", () => {
  const commun = {
    workId: WORK_ID,
    movementId: MOVEMENT_ID,
    voiceCode: "ALTO",
    extension: "wav",
  } as const;

  assert.notEqual(
    buildTrackKey({ ...commun, type: "SOLO" }),
    buildTrackKey({ ...commun, type: "PREDOMINANT" }),
  );
});

test("deux mouvements de la même oeuvre ne se marchent pas dessus", () => {
  const commun = {
    workId: WORK_ID,
    type: "SOLO",
    voiceCode: "BASS",
    extension: "wav",
  } as const;

  assert.notEqual(
    buildTrackKey({ ...commun, movementId: MOVEMENT_ID }),
    buildTrackKey({ ...commun, movementId: "cmsxmdigr0006wc3bzqikga73" }),
  );
});

test("la clé en attente porte le préfixe purgé au bout de sept jours", () => {
  const key = buildPendingKey("01J8ZQ", "Kyrie Soprano.wav");

  assert.equal(key, `${PENDING_PREFIX}/01j8zq/kyrie-soprano.wav`);
  assert.equal(isPendingKey(key), true);
});

test("une clé définitive n'est pas prise pour une clé en attente", () => {
  const key = buildTrackKey({
    workId: WORK_ID,
    movementId: MOVEMENT_ID,
    type: "PREVIEW",
    voiceCode: "TENOR",
    extension: "flac",
  });

  assert.equal(isPendingKey(key), false);
});

test("un nom de fichier vide retombe sur un libellé de secours", () => {
  assert.equal(buildPendingKey("abc", "///"), `${PENDING_PREFIX}/abc/fichier`);
});

test("le nettoyage retire accents, espaces et caractères douteux", () => {
  assert.equal(sanitizeSegment("Ténor 2 / Solo"), "tenor-2-solo");
  assert.equal(sanitizeSegment("../../etc/passwd"), "etc-passwd");
  assert.equal(sanitizeSegment("  "), "");
});

test("le nettoyage borne la longueur d'un segment", () => {
  assert.equal(sanitizeSegment("a".repeat(300)).length, 120);
});

test("seules les extensions audio prévues sont acceptées", () => {
  assert.equal(extensionOf("piste.wav"), "wav");
  assert.equal(extensionOf("piste.MP3"), "mp3");
  assert.equal(extensionOf("piste.flac"), "flac");
  assert.equal(extensionOf("piste.exe"), null);
  assert.equal(extensionOf("sans-extension"), null);
  assert.equal(extensionOf("finit-par-un-point."), null);
});

test("toutes les extensions annoncées sont bien reconnues", () => {
  for (const extension of ALLOWED_EXTENSIONS) {
    assert.equal(extensionOf(`piste.${extension}`), extension);
  }
});

test("une clé valide n'a ni remontée de chemin ni séparateur vide", () => {
  assert.equal(isValidKey("works/a/movements/b/SOLO/soprano.wav"), true);
  assert.equal(isValidKey(""), false);
  assert.equal(isValidKey("/works/a"), false);
  assert.equal(isValidKey("works/a/"), false);
  assert.equal(isValidKey("works//a"), false);
  assert.equal(isValidKey("works/../secrets"), false);
  assert.equal(isValidKey("works/./a"), false);
  assert.equal(isValidKey("a".repeat(1025)), false);
});

test("les clés produites par le module sont toujours valides", () => {
  assert.equal(
    isValidKey(
      buildTrackKey({
        workId: WORK_ID,
        movementId: MOVEMENT_ID,
        type: "ACCOMPANIMENT",
        voiceCode: null,
        extension: "wav",
      }),
    ),
    true,
  );
  assert.equal(isValidKey(buildPendingKey("01J8ZQ", "Kyrie.wav")), true);
});

test("le nom de téléchargement reste lisible et sans accent", () => {
  assert.equal(
    buildDownloadFilename("Messe en sol majeur", "Kyrie", "Ténor", "wav"),
    "messe-en-sol-majeur-kyrie-tenor.wav",
  );
});

test("un téléchargement sans pupitre est nommé tutti", () => {
  assert.equal(
    buildDownloadFilename("Mille regretz", "Mille regretz", null, "mp3"),
    "mille-regretz-mille-regretz-tutti.mp3",
  );
});

test("la limite de téléversement vaut bien 200 Mo", () => {
  assert.equal(MAX_UPLOAD_BYTES, 209715200);
});
