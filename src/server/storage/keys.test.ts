import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_EXTENSIONS,
  buildCoverKey,
  coverExtensionOf,
  coverPublicUrl,
  isCoverKey,
  MAX_UPLOAD_BYTES,
  PENDING_PREFIX,
  buildDownloadFilename,
  buildPendingKey,
  downloadPartLabel,
  buildTrackKey,
  extensionOf,
  isPendingKey,
  isValidKey,
  sanitizeSegment,
} from "@/server/storage/keys";

console.log(
  "▶ src/server/storage/keys.ts — construction et validation des clés d'objets",
);

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

test("une oeuvre à mouvement unique ne répète pas son titre", () => {
  assert.equal(
    buildDownloadFilename("Ce mois de mai", null, "TENOR", "wav"),
    "ce-mois-de-mai-tenor.wav",
  );
});

test("une piste sans pupitre est nommée tutti ou accompagnement, jamais confondus", () => {
  assert.equal(downloadPartLabel("TUTTI", null), "tutti");
  assert.equal(downloadPartLabel("ACCOMPANIMENT", null), "accompagnement");
  assert.equal(downloadPartLabel("PREDOMINANT", "TENOR"), "TENOR");
  assert.equal(
    buildDownloadFilename(
      "Messe en sol majeur",
      "Kyrie",
      downloadPartLabel("ACCOMPANIMENT", null),
      "mp3",
    ),
    "messe-en-sol-majeur-kyrie-accompagnement.mp3",
  );
});

test("la limite de téléversement vaut bien 200 Mo", () => {
  assert.equal(MAX_UPLOAD_BYTES, 209715200);
});

// ─── Images de couverture ───────────────────────────────────────────────────

test("la clé d'une couverture porte l'oeuvre, la version et l'extension", () => {
  assert.equal(
    buildCoverKey({ workId: WORK_ID, version: "v1", extension: "webp" }),
    `works/${WORK_ID}/cover/v1.webp`,
  );
});

test("changer de version change la clé, donc l'URL publique", () => {
  const premiere = buildCoverKey({
    workId: WORK_ID,
    version: "aaa",
    extension: "jpg",
  });
  const seconde = buildCoverKey({
    workId: WORK_ID,
    version: "bbb",
    extension: "jpg",
  });

  // C'est ce qui autorise un cache immuable : remplacer l'image ne réécrit
  // jamais une adresse déjà servie.
  assert.notEqual(premiere, seconde);
});

test("les extensions d'image acceptées sont reconnues, les autres non", () => {
  assert.equal(coverExtensionOf("pochette.jpg"), "jpg");
  assert.equal(coverExtensionOf("pochette.JPEG"), "jpeg");
  assert.equal(coverExtensionOf("pochette.png"), "png");
  assert.equal(coverExtensionOf("pochette.webp"), "webp");
  assert.equal(coverExtensionOf("pochette.gif"), null);
  assert.equal(coverExtensionOf("pochette.svg"), null);
  assert.equal(coverExtensionOf("sans-extension"), null);
});

test("une extension audio n'est pas une extension d'image", () => {
  // Les deux familles ont leur propre liste : une confusion ferait ranger un
  // fichier payant dans le bucket public.
  assert.equal(coverExtensionOf("piste.wav"), null);
  assert.equal(extensionOf("pochette.jpg"), null);
});

test("isCoverKey ne reconnaît que les clés de couverture", () => {
  assert.equal(isCoverKey(`works/${WORK_ID}/cover/v1.webp`), true);
  assert.equal(
    isCoverKey(`works/${WORK_ID}/movements/${MOVEMENT_ID}/SOLO/soprano.wav`),
    false,
  );
  assert.equal(isCoverKey("pending/abc/pochette.jpg"), false);
  assert.equal(isCoverKey(`works/${WORK_ID}/cover/v1.wav`), false);
  assert.equal(isCoverKey("../../etc/passwd"), false);
});

test("l'URL publique colle la racine du bucket à la clé", () => {
  assert.equal(
    coverPublicUrl("https://images.example", `works/${WORK_ID}/cover/v1.webp`),
    `https://images.example/works/${WORK_ID}/cover/v1.webp`,
  );
});
