import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deduceFilenames,
  readFilename,
  type MatrixContext,
} from "@/lib/admin/audio/filename-deduction";

console.log(
  "▶ src/lib/admin/audio/filename-deduction.ts — déduction du placement d'un fichier depuis son nom",
);

/**
 * Déduction du placement depuis le nom de fichier.
 */

/** Une oeuvre à quatre mouvements et quatre pupitres. */
const MESSE: MatrixContext = {
  movements: [
    { key: "m1", title: "Kyrie" },
    { key: "m2", title: "Gloria" },
    { key: "m3", title: "Credo" },
    { key: "m4", title: "Sanctus" },
  ],
  voices: [
    { code: "SOPRANO", label: "Soprano" },
    { code: "ALTO", label: "Alto" },
    { code: "TENOR", label: "Ténor" },
    { code: "BASS", label: "Basse" },
  ],
  hasAccompaniment: false,
  occupied: [],
};

/** Une oeuvre à mouvement unique. */
const MOTET: MatrixContext = {
  ...MESSE,
  movements: [{ key: "seul", title: "Ave Maria" }],
};

test("les trois champs exacts donnent une correspondance certaine", () => {
  const lu = readFilename("kyrie-soprano-solo.wav", MESSE);
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.ok && lu.candidate, {
    movementKey: "m1",
    voiceCode: "SOPRANO",
    type: "SOLO",
    confidence: "certain",
  });
});

test("un type en synonyme reste probable", () => {
  const lu = readFilename("gloria-alto-predom.wav", MESSE);
  assert.equal(lu.ok, true);
  assert.equal(lu.ok && lu.candidate.type, "PREDOMINANT");
  assert.equal(lu.ok && lu.candidate.confidence, "probable");
});

test("une abréviation de pupitre reste probable", () => {
  const lu = readFilename("credo-s-solo.wav", MESSE);
  assert.equal(lu.ok && lu.candidate.voiceCode, "SOPRANO");
  assert.equal(lu.ok && lu.candidate.confidence, "probable");
});

test("le mouvement omis se déduit sur une oeuvre à mouvement unique", () => {
  const lu = readFilename("soprano1-predom.wav", {
    ...MOTET,
    voices: [{ code: "SOPRANO_1", label: "Soprano 1" }],
  });
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.ok && lu.candidate, {
    movementKey: "seul",
    voiceCode: "SOPRANO_1",
    type: "PREDOMINANT",
    confidence: "probable",
  });
});

test("un pupitre à tiret bas se reconnaît par son code exact", () => {
  const contexte = {
    ...MOTET,
    voices: [{ code: "SOPRANO_1", label: "Soprano 1" }],
  };
  const lu = readFilename("avemaria-soprano1-solo.wav", contexte);
  assert.equal(lu.ok && lu.candidate.voiceCode, "SOPRANO_1");
  assert.equal(lu.ok && lu.candidate.confidence, "certain");
});

test("le mouvement omis reste ambigu quand l'oeuvre en a plusieurs", () => {
  const lu = readFilename("soprano-solo.wav", MESSE);
  assert.equal(lu.ok, false);
  assert.match(
    !lu.ok ? lu.reason : "",
    /mouvement non reconnu|mouvement absent/,
  );
});

test("un pupitre non retenu est refusé", () => {
  const lu = readFilename("kyrie-baryton-solo.wav", MESSE);
  assert.equal(lu.ok, false);
  assert.match(!lu.ok ? lu.reason : "", /pupitre non retenu/);
});

test("un nom illisible est refusé avec son motif", () => {
  const lu = readFilename("prise finale 3.wav", MESSE);
  assert.equal(lu.ok, false);
  assert.match(!lu.ok ? lu.reason : "", /type de piste non reconnu/);
});

test("un accompagnement non déclaré est refusé", () => {
  const lu = readFilename("kyrie-piano.wav", MESSE);
  assert.equal(lu.ok, false);
  assert.match(!lu.ok ? lu.reason : "", /accompagnement/);
});

test("une piste sans pupitre se nomme en deux champs", () => {
  const lu = readFilename("sanctus-tutti.wav", MESSE);
  assert.deepEqual(lu.ok && lu.candidate, {
    movementKey: "m4",
    voiceCode: null,
    type: "TUTTI",
    confidence: "certain",
  });
});

test("une case déjà occupée envoie le second en non associés", () => {
  const lot = deduceFilenames(["kyrie-soprano-solo.wav"], {
    ...MESSE,
    occupied: ["m1|SOPRANO|SOLO"],
  });
  assert.deepEqual(lot.placed, []);
  assert.equal(lot.rejected.length, 1);
  assert.match(lot.rejected[0].reason, /déjà occupée/);
});

test("les certaines passent avant les probables sur la même case", () => {
  const lot = deduceFilenames(
    ["kyrie-s-solo.wav", "kyrie-soprano-solo.wav"],
    MESSE,
  );
  assert.equal(lot.placed.length, 1);
  assert.equal(lot.placed[0].filename, "kyrie-soprano-solo.wav");
  assert.equal(lot.rejected[0].filename, "kyrie-s-solo.wav");
});

test("un lot de quarante fichiers bien nommés se place intégralement", () => {
  const mouvements = ["kyrie", "gloria", "credo", "sanctus"];
  const pupitres = ["soprano", "alto", "tenor", "bass"];
  const noms: string[] = [];
  for (const m of mouvements) {
    for (const v of pupitres) {
      noms.push(`${m}-${v}-solo.wav`, `${m}-${v}-predominant.wav`);
    }
    noms.push(`${m}-tutti.wav`);
  }
  for (const v of pupitres) noms.push(`kyrie-${v}-preview.wav`);

  assert.equal(noms.length, 40);
  const lot = deduceFilenames(noms, MESSE);
  assert.deepEqual(lot.rejected, []);
  assert.equal(lot.placed.length, 40);
  assert.equal(lot.placed.filter((p) => p.confidence === "certain").length, 40);
});

test("un lot mêlé se répartit entre les trois passes", () => {
  const lot = deduceFilenames(
    ["kyrie-soprano-solo.wav", "gloria-alto-predom.wav", "prise finale 3.wav"],
    MESSE,
  );
  assert.equal(lot.placed.filter((p) => p.confidence === "certain").length, 1);
  assert.equal(lot.placed.filter((p) => p.confidence === "probable").length, 1);
  assert.equal(lot.rejected.length, 1);
});
