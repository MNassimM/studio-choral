import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildLibraryRows,
  summarizeLibrary,
  type LibraryWorkInput,
} from "@/lib/library/library-rows";
import type { Grant } from "@/types/domain";

console.log(
  "▶ src/lib/library/library-rows.ts — une ligne par œuvre possédée, couverture et compte de fichiers",
);

const VOICES = [
  { id: "vs", code: "SOPRANO" },
  { id: "va", code: "ALTO" },
];

/** Un mouvement complet : 2 pupitres, un tutti, un accompagnement. */
function mouvement(id: string, titre: string) {
  return {
    id,
    title: titre,
    audioFiles: [
      { type: "PREDOMINANT" as const, voiceId: "vs" },
      { type: "SOLO" as const, voiceId: "vs" },
      { type: "PREVIEW" as const, voiceId: "vs" },
      { type: "PREDOMINANT" as const, voiceId: "va" },
      { type: "TUTTI" as const, voiceId: null },
      { type: "ACCOMPANIMENT" as const, voiceId: null },
    ],
  };
}

const MESSE: LibraryWorkInput = {
  id: "w1",
  slug: "messe",
  title: "Messe",
  composer: "Schubert",
  catalogueRef: "D.167",
  period: "CLASSICAL",
  voicing: "SATB",
  language: "la",
  movements: [mouvement("m1", "Kyrie"), mouvement("m2", "Gloria")],
};

const MOTET: LibraryWorkInput = {
  ...MESSE,
  id: "w2",
  slug: "motet",
  title: "Motet",
  catalogueRef: null,
  movements: [mouvement("m3", "Motet")],
};

function droit(over: Partial<Grant> & { workId: string }): Grant {
  return {
    movementId: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    ...over,
  };
}

const LE_11 = new Date("2026-09-11T10:00:00Z");
const LE_26 = new Date("2026-08-26T10:00:00Z");

test("une œuvre possédée entièrement compte tous ses fichiers", () => {
  const [row] = buildLibraryRows({
    works: [MESSE],
    grants: [droit({ workId: "w1" })],
    items: [{ workId: "w1", grantedAt: LE_11, source: "PURCHASE" }],
    voices: VOICES,
    getVoiceLabel: (code) => `label:${code}`,
  });

  // 2 mouvements x (2 voix prédominantes + tutti + accompagnement). La voix
  // seule et l'extrait ne se téléchargent pas.
  assert.equal(row.downloadableCount, 8);
  assert.equal(row.ownsFullWork, true);
  assert.equal(row.unlockedMovementCount, 2);
  assert.equal(row.purchased, true);
  assert.deepEqual(row.ownedVoiceLabels, ["label:SOPRANO", "label:ALTO"]);
});

test("un seul pupitre ne débloque ni le tutti ni l'accompagnement des autres", () => {
  const [row] = buildLibraryRows({
    works: [MESSE],
    grants: [
      droit({ workId: "w1", coverage: "SINGLE_VOICE", voiceCode: "ALTO" }),
    ],
    items: [{ workId: "w1", grantedAt: LE_11, source: "MANUAL_GRANT" }],
    voices: VOICES,
    getVoiceLabel: (code) => code,
  });

  // Par mouvement : l'alto et l'accompagnement, jamais le tutti ni le soprano.
  assert.equal(row.downloadableCount, 4);
  assert.equal(row.ownsFullWork, false);
  assert.equal(row.purchased, false);
  assert.deepEqual(
    row.coverage[0].cells.map((cell) => `${cell.code}:${cell.owned}`),
    ["SOPRANO:false", "ALTO:true"],
  );
});

test("plusieurs droits sur une œuvre ne donnent qu'une ligne", () => {
  const rows = buildLibraryRows({
    works: [MESSE],
    grants: [
      droit({ workId: "w1" }),
      droit({
        workId: "w1",
        scope: "MOVEMENT",
        movementId: "m1",
        coverage: "SINGLE_VOICE",
        voiceCode: "ALTO",
      }),
    ],
    items: [
      { workId: "w1", grantedAt: LE_26, source: "MANUAL_GRANT" },
      { workId: "w1", grantedAt: LE_11, source: "MANUAL_GRANT" },
    ],
    voices: VOICES,
    getVoiceLabel: (code) => code,
  });

  assert.equal(rows.length, 1);
  // La date retenue est celle du droit le plus récent.
  assert.equal(rows[0].addedAt.toISOString(), LE_11.toISOString());
});

test("les œuvres vont du droit le plus récent au plus ancien", () => {
  const rows = buildLibraryRows({
    works: [MESSE, MOTET],
    grants: [droit({ workId: "w1" }), droit({ workId: "w2" })],
    items: [
      { workId: "w1", grantedAt: LE_26, source: "PURCHASE" },
      { workId: "w2", grantedAt: LE_11, source: "PURCHASE" },
    ],
    voices: VOICES,
    getVoiceLabel: (code) => code,
  });

  assert.deepEqual(
    rows.map((row) => row.slug),
    ["motet", "messe"],
  );
});

test("une œuvre sans aucun accès résolu n'apparaît pas", () => {
  // Le droit vise une autre œuvre : rien à montrer, et surtout pas une ligne
  // vide qui laisserait croire à un accès.
  const rows = buildLibraryRows({
    works: [MESSE],
    grants: [droit({ workId: "autre" })],
    items: [{ workId: "w1", grantedAt: LE_11, source: "MANUAL_GRANT" }],
    voices: VOICES,
    getVoiceLabel: (code) => code,
  });

  assert.deepEqual(rows, []);
});

test("le résumé additionne œuvres, mouvements débloqués et fichiers", () => {
  const rows = buildLibraryRows({
    works: [MESSE, MOTET],
    grants: [droit({ workId: "w1" }), droit({ workId: "w2" })],
    items: [
      { workId: "w1", grantedAt: LE_26, source: "PURCHASE" },
      { workId: "w2", grantedAt: LE_11, source: "PURCHASE" },
    ],
    voices: VOICES,
    getVoiceLabel: (code) => code,
  });

  assert.deepEqual(summarizeLibrary(rows), {
    works: 2,
    movements: 3,
    files: 12,
  });
});
