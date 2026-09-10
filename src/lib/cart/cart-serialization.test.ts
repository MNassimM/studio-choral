import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CART_STORAGE_VERSION,
  parseCart,
  serializeCart,
} from "@/lib/cart/cart-serialization";
import type { CartItem } from "@/lib/cart/types";

console.log(
  "▶ src/lib/cart/cart-serialization.ts — écriture et relecture défensive du panier conservé",
);

const ligne: CartItem = {
  sku: "MESSE-KYRIE-ALTO",
  workId: "work-messe",
  movementId: "kyrie",
  voiceCode: "ALTO",
  scope: "MOVEMENT",
  coverage: "SINGLE_VOICE",
  addedAt: 1756400000000,
};

test("un panier écrit puis relu est identique", () => {
  const relu = parseCart(serializeCart([ligne]));

  assert.deepEqual(relu, [ligne]);
});

test("le format écrit porte la version et aucune donnée d'affichage", () => {
  const payload = JSON.parse(serializeCart([ligne]));

  assert.equal(payload.version, CART_STORAGE_VERSION);
  assert.deepEqual(Object.keys(payload).sort(), ["items", "version"]);
  assert.deepEqual(Object.keys(payload.items[0]).sort(), [
    "addedAt",
    "coverage",
    "movementId",
    "scope",
    "sku",
    "voiceCode",
    "workId",
  ]);
});

test("un contenu absent donne un panier vide", () => {
  assert.deepEqual(parseCart(null), []);
  assert.deepEqual(parseCart(undefined), []);
  assert.deepEqual(parseCart(""), []);
});

test("un JSON invalide donne un panier vide", () => {
  assert.deepEqual(parseCart("{ceci n'est pas du json"), []);
  assert.deepEqual(parseCart("[[[["), []);
});

test("une valeur JSON qui n'est pas un objet donne un panier vide", () => {
  assert.deepEqual(parseCart("null"), []);
  assert.deepEqual(parseCart("42"), []);
  assert.deepEqual(parseCart('"chaine"'), []);
  assert.deepEqual(parseCart("[]"), []);
});

test("une version différente est ignorée en entier", () => {
  const ancien = JSON.stringify({ version: 0, items: [ligne] });

  assert.deepEqual(parseCart(ancien), []);
});

test("une version absente est ignorée en entier", () => {
  assert.deepEqual(parseCart(JSON.stringify({ items: [ligne] })), []);
});

test("des lignes qui ne sont pas un tableau donnent un panier vide", () => {
  const payload = JSON.stringify({
    version: CART_STORAGE_VERSION,
    items: { sku: "MESSE-KYRIE-ALTO" },
  });

  assert.deepEqual(parseCart(payload), []);
});

test("les lignes inexploitables sont écartées, les autres conservées", () => {
  const payload = JSON.stringify({
    version: CART_STORAGE_VERSION,
    items: [
      null,
      42,
      { sku: "" },
      { ...ligne, sku: 12 },
      { ...ligne, scope: "AUTRE" },
      { ...ligne, coverage: "AUTRE" },
      { ...ligne, addedAt: "hier" },
      { ...ligne, workId: null },
      ligne,
    ],
  });

  assert.deepEqual(parseCart(payload), [ligne]);
});

test("une ligne incohérente entre portée et mouvement est écartée", () => {
  const payload = JSON.stringify({
    version: CART_STORAGE_VERSION,
    items: [
      // Portée WORK mais un mouvement renseigné.
      { ...ligne, sku: "A", scope: "WORK", movementId: "kyrie" },
      // Portée MOVEMENT sans mouvement.
      { ...ligne, sku: "B", scope: "MOVEMENT", movementId: null },
    ],
  });

  assert.deepEqual(parseCart(payload), []);
});

test("une ligne incohérente entre couverture et pupitre est écartée", () => {
  const payload = JSON.stringify({
    version: CART_STORAGE_VERSION,
    items: [
      // Toutes les voix, mais un pupitre renseigné.
      { ...ligne, sku: "A", coverage: "ALL_VOICES", voiceCode: "ALTO" },
      // Un seul pupitre, mais aucun renseigné.
      { ...ligne, sku: "B", coverage: "SINGLE_VOICE", voiceCode: null },
    ],
  });

  assert.deepEqual(parseCart(payload), []);
});

test("une référence en double n'est conservée qu'une fois", () => {
  const payload = JSON.stringify({
    version: CART_STORAGE_VERSION,
    items: [ligne, { ...ligne, addedAt: 1 }],
  });

  const relu = parseCart(payload);
  assert.equal(relu.length, 1);
  assert.equal(relu[0].addedAt, ligne.addedAt);
});
