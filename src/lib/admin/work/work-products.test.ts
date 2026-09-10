import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildProductRows,
  buildSku,
  sellsPerMovement,
  uniqueSlugs,
} from "@/lib/admin/work/work-products";

console.log(
  "▶ src/lib/admin/work/work-products.ts — génération des offres, des slugs et des références",
);

const VOICES = [
  { id: "v-s", code: "SOPRANO", label: "Soprano" },
  { id: "v-a", code: "ALTO", label: "Alto" },
  { id: "v-t", code: "TENOR", label: "Ténor" },
  { id: "v-b", code: "BASS", label: "Basse" },
];

const MOUVEMENTS = [
  "Kyrie",
  "Gloria",
  "Credo",
  "Sanctus",
  "Benedictus",
  "Agnus Dei",
].map((title, index) => ({
  id: `m-${index}`,
  slug: uniqueSlugs([
    "Kyrie",
    "Gloria",
    "Credo",
    "Sanctus",
    "Benedictus",
    "Agnus Dei",
  ])[index],
  title,
}));

const PRIX = {
  movementSingleVoice: 1.9,
  movementAllVoices: 3.9,
  workSingleVoice: 8.9,
  workAllVoices: 14.9,
};

test("six mouvements et quatre pupitres donnent trente cinq offres", () => {
  const rows = buildProductRows(
    "messe-en-sol-majeur",
    "Messe en sol majeur",
    MOUVEMENTS,
    VOICES,
    PRIX,
  );

  assert.equal(rows.length, 35);
  assert.equal(rows.filter((row) => row.scope === "MOVEMENT").length, 30);
  assert.equal(rows.filter((row) => row.scope === "WORK").length, 5);
});

test("les références produites sont toutes distinctes", () => {
  const rows = buildProductRows(
    "messe-en-sol-majeur",
    "Messe en sol majeur",
    MOUVEMENTS,
    VOICES,
    PRIX,
  );
  const skus = rows.map((row) => row.sku);

  assert.equal(new Set(skus).size, 35);
});

test("les références suivent le format déjà en base", () => {
  const rows = buildProductRows(
    "messe-en-sol-majeur",
    "Messe en sol majeur",
    MOUVEMENTS,
    VOICES,
    PRIX,
  );
  const skus = new Set(rows.map((row) => row.sku));

  assert.ok(skus.has("messe-en-sol-majeur:kyrie:soprano"));
  assert.ok(skus.has("messe-en-sol-majeur:kyrie:all"));
  assert.ok(skus.has("messe-en-sol-majeur:soprano"));
  assert.ok(skus.has("messe-en-sol-majeur:all"));
});

test("une oeuvre à mouvement unique ne produit que les cinq offres d'oeuvre", () => {
  const rows = buildProductRows(
    "mille-regretz",
    "Mille regretz",
    [{ id: "m-0", slug: "mille-regretz", title: "Mille regretz" }],
    VOICES,
    {
      movementSingleVoice: null,
      movementAllVoices: null,
      workSingleVoice: 2.5,
      workAllVoices: 3.9,
    },
  );

  assert.equal(rows.length, 5);
  assert.equal(rows.filter((row) => row.scope === "MOVEMENT").length, 0);
});

test("les prix sont stockés en centimes entiers", () => {
  const rows = buildProductRows(
    "messe-en-sol-majeur",
    "Messe en sol majeur",
    MOUVEMENTS,
    VOICES,
    PRIX,
  );

  const mvtVoix = rows.find(
    (row) => row.scope === "MOVEMENT" && row.coverage === "SINGLE_VOICE",
  );
  const packComplet = rows.find(
    (row) => row.scope === "WORK" && row.coverage === "ALL_VOICES",
  );

  assert.equal(mvtVoix?.priceCents, 190);
  assert.equal(packComplet?.priceCents, 1490);
});

test("les invariants de scope et de coverage sont respectés", () => {
  const rows = buildProductRows(
    "messe-en-sol-majeur",
    "Messe en sol majeur",
    MOUVEMENTS,
    VOICES,
    PRIX,
  );

  for (const row of rows) {
    if (row.scope === "WORK") assert.equal(row.movementId ?? null, null);
    if (row.scope === "MOVEMENT") assert.notEqual(row.movementId ?? null, null);
    if (row.coverage === "ALL_VOICES") assert.equal(row.voiceId ?? null, null);
    if (row.coverage === "SINGLE_VOICE")
      assert.notEqual(row.voiceId ?? null, null);
  }
});

test("les positions sont uniques et démarrent à un", () => {
  const rows = buildProductRows(
    "messe-en-sol-majeur",
    "Messe en sol majeur",
    MOUVEMENTS,
    VOICES,
    PRIX,
  );
  const positions = rows.map((row) => row.position);

  assert.equal(new Set(positions).size, rows.length);
  assert.equal(Math.min(...positions), 1);
  assert.equal(Math.max(...positions), 35);
});

test("une référence se construit sans mouvement ni voix", () => {
  assert.equal(buildSku("messe", "kyrie", "SOPRANO"), "messe:kyrie:soprano");
  assert.equal(buildSku("messe", "kyrie", null), "messe:kyrie:all");
  assert.equal(buildSku("messe", null, "BASS"), "messe:bass");
  assert.equal(buildSku("messe", null, null), "messe:all");
});

test("une oeuvre ne se vend au mouvement qu'au delà d'un mouvement", () => {
  assert.equal(sellsPerMovement(1), false);
  assert.equal(sellsPerMovement(2), true);
});

test("deux mouvements homonymes reçoivent des slugs distincts", () => {
  assert.deepEqual(uniqueSlugs(["Kyrie", "Kyrie", "Agnus Dei"]), [
    "kyrie",
    "kyrie-2",
    "agnus-dei",
  ]);
});
