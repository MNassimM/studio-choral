import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveWorkAccess } from "@/domain/access/work-access";
import {
  buildDownloadGroups,
  toDownloadRow,
} from "@/features/work/domain/download-groups";
import type { Grant, WorkAccessInput } from "@/domain/types";

console.log(
  "▶ src/features/work/domain/download-groups.ts — pistes téléchargeables, leur ordre et leur mise en forme",
);

const VOICES = [
  { id: "vs", code: "SOPRANO" },
  { id: "va", code: "ALTO" },
];
const voiceCodeById = new Map(VOICES.map((v) => [v.id, v.code]));
const voiceLabelByCode = new Map(
  VOICES.map((v) => [v.code, `label:${v.code}`]),
);
const voiceOrderByCode = new Map(VOICES.map((v, i) => [v.code, i]));

const LAYOUT: WorkAccessInput = {
  id: "w1",
  movements: [{ id: "m1", voiceCodes: ["SOPRANO", "ALTO"] }],
};

/** Pistes rendues dans le désordre, comme la base peut le faire. */
const MOUVEMENTS = [
  {
    id: "m1",
    title: "Kyrie",
    audioFiles: [
      {
        id: "a-acc",
        type: "ACCOMPANIMENT" as const,
        voiceId: null,
        mimeType: "audio/wav",
        sizeBytes: 4096,
      },
      {
        id: "a-tutti",
        type: "TUTTI" as const,
        voiceId: null,
        mimeType: "audio/wav",
        sizeBytes: 4096,
      },
      {
        id: "a-alto",
        type: "PREDOMINANT" as const,
        voiceId: "va",
        mimeType: "audio/wav",
        sizeBytes: 2048,
      },
      {
        id: "a-sop-solo",
        type: "SOLO" as const,
        voiceId: "vs",
        mimeType: "audio/wav",
        sizeBytes: 2048,
      },
      {
        id: "a-sop-prev",
        type: "PREVIEW" as const,
        voiceId: "vs",
        mimeType: "audio/wav",
        sizeBytes: 512,
      },
      {
        id: "a-sop",
        type: "PREDOMINANT" as const,
        voiceId: "vs",
        mimeType: "audio/mpeg",
        sizeBytes: null,
      },
    ],
  },
];

const TOUTES_VOIX: Grant = {
  workId: "w1",
  movementId: null,
  voiceCode: null,
  scope: "WORK",
  coverage: "ALL_VOICES",
};

function groupsFor(grants: Grant[]) {
  return buildDownloadGroups({
    access: resolveWorkAccess(LAYOUT, grants),
    movements: MOUVEMENTS,
    voiceCodeById,
    voiceLabelByCode,
    voiceOrderByCode,
  });
}

test("les pupitres passent avant le tutti, puis l'accompagnement", () => {
  const [groupe] = groupsFor([TOUTES_VOIX]);

  assert.deepEqual(
    groupe.entries.map((entree) => entree.audioFileId),
    ["a-sop", "a-alto", "a-tutti", "a-acc"],
  );
});

test("l'extrait et la voix seule ne sont jamais proposés", () => {
  const [groupe] = groupsFor([TOUTES_VOIX]);
  const types = groupe.entries.map((entree) => entree.audioType);

  assert.equal(types.includes("PREVIEW" as never), false);
  assert.equal(types.includes("SOLO" as never), false);
});

test("sans droit, toutes les pistes sont présentes mais verrouillées", () => {
  const [groupe] = groupsFor([]);

  assert.equal(groupe.entries.length, 4);
  assert.equal(
    groupe.entries.every((entree) => entree.owned === false),
    true,
  );
  assert.equal(groupe.unlocked, false);
});

test("une ligne affiche le pupitre, le type, le format et la taille", () => {
  const [groupe] = groupsFor([TOUTES_VOIX]);
  const labels = {
    audioTypeLabel: (type: string) => `type:${type}`,
    formatSize: (bytes: number) => `${bytes} o`,
    formatLabel: (mime: string) => mime.split("/")[1].toUpperCase(),
  };

  assert.deepEqual(toDownloadRow(groupe.entries[1], labels), {
    audioFileId: "a-alto",
    title: "label:ALTO_type:PREDOMINANT",
    meta: "WAV · 2048 o",
    owned: true,
  });
});

test("le mouvement se préfixe au nom quand l'affichage ne le nomme pas", () => {
  const [groupe] = groupsFor([TOUTES_VOIX]);
  const ligne = toDownloadRow(
    groupe.entries[1],
    {
      audioTypeLabel: () => "Voix prédominante",
      formatSize: () => "2 Ko",
      formatLabel: () => "WAV",
    },
    "Kyrie",
  );

  // Les espaces du type deviennent des tirets, comme dans le nom du fichier.
  assert.equal(ligne.title, "Kyrie_label:ALTO_Voix-prédominante");
});

test("une piste sans pupitre n'affiche que son type", () => {
  const [groupe] = groupsFor([TOUTES_VOIX]);
  const ligne = toDownloadRow(groupe.entries[2], {
    audioTypeLabel: () => "Tutti",
    formatSize: () => "4 Ko",
    formatLabel: () => "WAV",
  });

  assert.equal(ligne.title, "Tutti");
});

test("une taille inconnue ne laisse que le format", () => {
  const [groupe] = groupsFor([TOUTES_VOIX]);
  const ligne = toDownloadRow(groupe.entries[0], {
    audioTypeLabel: () => "Voix prédominante",
    formatSize: () => "jamais appelé",
    formatLabel: (mime) => mime.split("/")[1].toUpperCase(),
  });

  assert.equal(ligne.meta, "MPEG");
});
