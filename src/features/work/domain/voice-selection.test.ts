import { test } from "node:test";
import assert from "node:assert/strict";

import {
  keepSelectable,
  toggleOffer,
  type SelectableOffer,
} from "@/features/work/domain/voice-selection";

console.log(
  "▶ src/features/work/domain/voice-selection.ts — sélection des pupitres et bascule du pack toutes voix",
);

const soprano: SelectableOffer = { sku: "S", coverage: "SINGLE_VOICE" };
const alto: SelectableOffer = { sku: "A", coverage: "SINGLE_VOICE" };
const tenor: SelectableOffer = { sku: "T", coverage: "SINGLE_VOICE" };
const toutes: SelectableOffer = { sku: "ALL", coverage: "ALL_VOICES" };

const offres = [soprano, alto, tenor, toutes];

test("cocher un pupitre l'ajoute à la sélection", () => {
  assert.deepEqual(toggleOffer([], soprano, offres), ["S"]);
});

test("recocher un pupitre déjà coché le retire", () => {
  assert.deepEqual(toggleOffer(["S", "A"], soprano, offres), ["A"]);
});

test("cocher toutes les voix décoche les pupitres", () => {
  assert.deepEqual(toggleOffer(["S", "A"], toutes, offres), ["ALL"]);
});

test("cocher un pupitre décoche toutes les voix", () => {
  assert.deepEqual(toggleOffer(["ALL"], tenor, offres), ["T"]);
});

test("décocher toutes les voix ne touche à rien d'autre", () => {
  assert.deepEqual(toggleOffer(["ALL"], toutes, offres), []);
});

test("plusieurs pupitres cohabitent", () => {
  const apres = toggleOffer(toggleOffer(["S"], alto, offres), tenor, offres);

  assert.deepEqual(apres, ["S", "A", "T"]);
});

test("l'ordre de coche est conservé", () => {
  assert.deepEqual(toggleOffer(["T", "S"], alto, offres), ["T", "S", "A"]);
});

test("une référence qui n'est plus proposée sort de la sélection", () => {
  assert.deepEqual(keepSelectable(["S", "X", "ALL"], offres), ["S", "ALL"]);
});
