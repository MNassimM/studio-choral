import { test } from "node:test";
import assert from "node:assert/strict";

import { dedupeGrants } from "@/lib/access/grants";
import { ACCESS_POLICY } from "@/lib/access/policy";
import {
  canDownload,
  canStream,
  capabilitiesFor,
  resolveWorkAccess,
} from "@/lib/access/rules";
import type { Grant, WorkAccessInput } from "@/types/domain";

const SATB = ["SOPRANO", "ALTO", "TENOR", "BASS"];

// Œuvre de test : 2 mouvements, 4 pupitres chacun
const messe: WorkAccessInput = {
  id: "work-messe",
  movements: [
    { id: "kyrie", voiceCodes: SATB },
    { id: "gloria", voiceCodes: SATB },
  ],
};

function grant(overrides: Partial<Grant>): Grant {
  return {
    workId: "work-messe",
    movementId: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    ...overrides,
  };
}

test("sans aucun droit, rien n'est accessible", () => {
  const access = resolveWorkAccess(messe, []);

  assert.equal(access.ownsAnything, false);
  assert.equal(access.ownsFullWork, false);
  assert.equal(access.unlockedMovementCount, 0);
  assert.deepEqual(access.ownedVoiceCodes, []);
  assert.equal(
    canStream(access, {
      movementId: "kyrie",
      type: "TUTTI",
      voiceCode: null,
    }),
    false,
  );
});

test("l'extrait reste accessible sans achat", () => {
  const access = resolveWorkAccess(messe, []);

  assert.deepEqual(
    capabilitiesFor(access, {
      movementId: "kyrie",
      type: "PREVIEW",
      voiceCode: "ALTO",
    }),
    ["PREVIEW"],
  );
});

test("« Alto - Kyrie » débloque l'alto du Kyrie", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
  ]);

  assert.equal(
    canStream(access, { movementId: "kyrie", type: "SOLO", voiceCode: "ALTO" }),
    true,
  );
  assert.equal(
    canDownload(access, {
      movementId: "kyrie",
      type: "PREDOMINANT",
      voiceCode: "ALTO",
    }),
    true,
  );
});

test("un pupitre possédé permet d'écouter la voix seule, mais pas de la télécharger", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
  ]);

  assert.equal(
    canStream(access, { movementId: "kyrie", type: "SOLO", voiceCode: "ALTO" }),
    true,
  );
  assert.equal(
    canDownload(access, {
      movementId: "kyrie",
      type: "SOLO",
      voiceCode: "ALTO",
    }),
    false,
  );
});

test("« Alto - Kyrie » ne débloque PAS le ténor du Kyrie", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
  ]);

  assert.equal(
    canStream(access, {
      movementId: "kyrie",
      type: "SOLO",
      voiceCode: "TENOR",
    }),
    false,
  );
});

test("« Alto - Kyrie » ne débloque PAS l'alto du Gloria", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
  ]);

  assert.equal(
    canStream(access, {
      movementId: "gloria",
      type: "SOLO",
      voiceCode: "ALTO",
    }),
    false,
  );
  assert.equal(access.movements.gloria.unlocked, false);
});

test("un pupitre possédé permet d'écouter le tutti du mouvement", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
  ]);

  assert.equal(
    canStream(access, { movementId: "kyrie", type: "TUTTI", voiceCode: null }),
    true,
  );
});

test("un pupitre possédé ne permet PAS de télécharger le tutti", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
  ]);

  assert.equal(
    canDownload(access, {
      movementId: "kyrie",
      type: "TUTTI",
      voiceCode: null,
    }),
    false,
  );
});

test("« toutes voix - Kyrie » permet de télécharger le tutti du Kyrie", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "ALL_VOICES",
    }),
  ]);

  assert.equal(
    canDownload(access, {
      movementId: "kyrie",
      type: "TUTTI",
      voiceCode: null,
    }),
    true,
  );
});

test("« toutes voix - œuvre entière » débloque tout, sur tous les mouvements", () => {
  const access = resolveWorkAccess(messe, [grant({})]);

  assert.equal(access.ownsFullWork, true);
  assert.equal(access.unlockedMovementCount, 2);
  for (const movementId of ["kyrie", "gloria"]) {
    assert.equal(access.movements[movementId].unlocked, true);
    assert.deepEqual(
      new Set(access.movements[movementId].ownedVoiceCodes),
      new Set(SATB),
    );
    assert.equal(
      canDownload(access, { movementId, type: "TUTTI", voiceCode: null }),
      true,
    );
  }
});

test("« Alto - œuvre entière » débloque l'alto sur TOUS les mouvements", () => {
  const access = resolveWorkAccess(messe, [
    grant({ scope: "WORK", coverage: "SINGLE_VOICE", voiceCode: "ALTO" }),
  ]);

  for (const movementId of ["kyrie", "gloria"]) {
    assert.equal(access.movements[movementId].unlocked, true);
    assert.deepEqual(access.movements[movementId].ownedVoiceCodes, ["ALTO"]);
    assert.equal(
      canStream(access, {
        movementId,
        type: "SOLO",
        voiceCode: "ALTO",
      }),
      true,
    );
  }
  assert.deepEqual(access.ownedVoiceCodes, ["ALTO"]);
});

test("ownsFullWork est vrai seulement si TOUS les mouvements sont débloqués", () => {
  // Cas négatif direct : un seul des deux mouvements est débloqué.
  const partial = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "ALL_VOICES",
    }),
  ]);
  assert.equal(partial.ownsFullWork, false);

  // Tous les mouvements sont débloqués, mais avec un seul pupitre chacun :
  // "tous débloqués" ne suffit pas, il faut toutes les voix partout.
  const altoEverywhere = resolveWorkAccess(messe, [
    grant({ scope: "WORK", coverage: "SINGLE_VOICE", voiceCode: "ALTO" }),
  ]);
  assert.equal(altoEverywhere.unlockedMovementCount, 2);
  assert.equal(altoEverywhere.ownsFullWork, false);

  // Cas positif : toutes les voix, tous les mouvements.
  const full = resolveWorkAccess(messe, [grant({})]);
  assert.equal(full.ownsFullWork, true);
});

test("unlockedMovementCount reflète bien 4 mouvements sur 6", () => {
  const sixMovementWork: WorkAccessInput = {
    id: "work-messe-6",
    movements: [
      { id: "kyrie", voiceCodes: SATB },
      { id: "gloria", voiceCodes: SATB },
      { id: "credo", voiceCodes: SATB },
      { id: "sanctus", voiceCodes: SATB },
      { id: "benedictus", voiceCodes: SATB },
      { id: "agnus-dei", voiceCodes: SATB },
    ],
  };

  const access = resolveWorkAccess(
    sixMovementWork,
    ["kyrie", "gloria", "credo", "sanctus"].map((movementId) =>
      grant({
        workId: "work-messe-6",
        scope: "MOVEMENT",
        movementId,
        coverage: "SINGLE_VOICE",
        voiceCode: "ALTO",
      }),
    ),
  );

  assert.equal(access.unlockedMovementCount, 4);
  assert.equal(access.totalMovementCount, 6);
  assert.equal(access.movements["benedictus"].unlocked, false);
  assert.equal(access.movements["agnus-dei"].unlocked, false);
});

test("deux droits cumulés se combinent sur le même mouvement", () => {
  const access = resolveWorkAccess(messe, [
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "ALTO",
    }),
    grant({
      scope: "MOVEMENT",
      movementId: "kyrie",
      coverage: "SINGLE_VOICE",
      voiceCode: "TENOR",
    }),
  ]);

  assert.deepEqual(
    new Set(access.movements.kyrie.ownedVoiceCodes),
    new Set(["ALTO", "TENOR"]),
  );
});

test("dedupeGrants absorbe un droit étroit quand un droit large existe", () => {
  const altoKyrie = grant({
    scope: "MOVEMENT",
    movementId: "kyrie",
    coverage: "SINGLE_VOICE",
    voiceCode: "ALTO",
  });
  const altoWork = grant({
    scope: "WORK",
    coverage: "SINGLE_VOICE",
    voiceCode: "ALTO",
  });

  const result = dedupeGrants([altoKyrie, altoWork]);

  assert.deepEqual(result, [altoWork]);
});

test("dedupeGrants fonctionne dans les deux ordres d'insertion", () => {
  const altoKyrie = grant({
    scope: "MOVEMENT",
    movementId: "kyrie",
    coverage: "SINGLE_VOICE",
    voiceCode: "ALTO",
  });
  const altoWork = grant({
    scope: "WORK",
    coverage: "SINGLE_VOICE",
    voiceCode: "ALTO",
  });

  assert.deepEqual(dedupeGrants([altoWork, altoKyrie]), [altoWork]);
  assert.deepEqual(dedupeGrants([altoKyrie, altoWork]), [altoWork]);
});

test("un droit portant sur une autre œuvre est ignoré", () => {
  const access = resolveWorkAccess(messe, [
    grant({ workId: "work-autre-oeuvre" }),
  ]);

  assert.equal(access.ownsAnything, false);
  assert.equal(access.unlockedMovementCount, 0);
});

test("preuve que la politique commerciale est bien centralisée", () => {
  // Sanity check du fixture lui-même
  assert.equal(ACCESS_POLICY.ownedVoiceUnlocksTuttiDownload, false);
});
