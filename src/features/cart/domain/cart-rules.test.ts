import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addToCart,
  clearCart,
  findCoveredItems,
  findOwnedItems,
  removeFromCart,
  removeOwnedItems,
  replaceInCart,
} from "@/features/cart/domain/cart-rules";
import { cartItemToGrant } from "@/features/cart/domain/cart-item";
import type { CartItem, CartItemInput } from "@/features/cart/domain/types";
import type { Grant } from "@/domain/types";

console.log(
  "▶ src/features/cart/domain/cart-rules.ts — ajout, retrait, remplacement et articles déjà possédés",
);

const WORK = "work-messe";

// Alto sur le seul Kyrie : la portée et la couverture les plus étroites.
const altoKyrie: CartItemInput = {
  sku: "MESSE-KYRIE-ALTO",
  workId: WORK,
  movementId: "kyrie",
  voiceCode: "ALTO",
  scope: "MOVEMENT",
  coverage: "SINGLE_VOICE",
};

// Toutes les voix du Kyrie : couvre altoKyrie.
const toutesVoixKyrie: CartItemInput = {
  sku: "MESSE-KYRIE-ALL",
  workId: WORK,
  movementId: "kyrie",
  voiceCode: null,
  scope: "MOVEMENT",
  coverage: "ALL_VOICES",
};

// Toutes les voix de l'œuvre entière : couvre les deux précédents.
const oeuvreComplete: CartItemInput = {
  sku: "MESSE-WORK-ALL",
  workId: WORK,
  movementId: null,
  voiceCode: null,
  scope: "WORK",
  coverage: "ALL_VOICES",
};

// Autre œuvre : ne doit jamais interagir avec les précédents.
const autreOeuvre: CartItemInput = {
  sku: "MILLE-WORK-ALL",
  workId: "work-mille-regretz",
  movementId: null,
  voiceCode: null,
  scope: "WORK",
  coverage: "ALL_VOICES",
};

function cart(...inputs: CartItemInput[]): CartItem[] {
  return inputs.reduce<CartItem[]>(
    (items, input, index) => addToCart(items, input, 1000 + index),
    [],
  );
}

function grant(overrides: Partial<Grant>): Grant {
  return {
    workId: WORK,
    movementId: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    ...overrides,
  };
}

test("un panier vide ne contient aucune ligne", () => {
  assert.deepEqual(clearCart(), []);
  assert.deepEqual(findCoveredItems([], altoKyrie), []);
});

test("un ajout simple place le produit dans le panier", () => {
  const items = addToCart([], altoKyrie, 1000);

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, "MESSE-KYRIE-ALTO");
  assert.equal(items[0].addedAt, 1000);
  assert.deepEqual(cartItemToGrant(items[0]), {
    workId: WORK,
    movementId: "kyrie",
    voiceCode: "ALTO",
    scope: "MOVEMENT",
    coverage: "SINGLE_VOICE",
  });
});

test("ajouter deux fois le même produit ne fait rien", () => {
  const once = addToCart([], altoKyrie, 1000);
  const twice = addToCart(once, altoKyrie, 2000);

  assert.equal(twice.length, 1);
  assert.equal(twice[0].addedAt, 1000);
  // Le panier est rendu tel quel, sans nouvelle allocation.
  assert.equal(twice, once);
});

test("un produit large annonce les articles étroits qu'il remplacerait", () => {
  const covered = findCoveredItems(cart(altoKyrie), toutesVoixKyrie);

  assert.equal(covered.length, 1);
  assert.equal(covered[0].sku, "MESSE-KYRIE-ALTO");
});

test("un produit étroit ne remplacerait pas le produit large qui le couvre", () => {
  const covered = findCoveredItems(cart(toutesVoixKyrie), altoKyrie);

  assert.deepEqual(covered, []);
});

test("le pack de l'œuvre entière remplacerait toutes les lignes de cette œuvre", () => {
  const covered = findCoveredItems(
    cart(altoKyrie, toutesVoixKyrie, autreOeuvre),
    oeuvreComplete,
  );

  assert.deepEqual(
    covered.map((item) => item.sku),
    ["MESSE-KYRIE-ALTO", "MESSE-KYRIE-ALL"],
  );
});

test("une autre œuvre ne remplacerait jamais les lignes de la première", () => {
  const covered = findCoveredItems(cart(altoKyrie), autreOeuvre);

  assert.deepEqual(covered, []);
});

test("le remplacement retire les couverts et ajoute le nouveau en une fois", () => {
  const items = replaceInCart(
    cart(altoKyrie, autreOeuvre),
    toutesVoixKyrie,
    3000,
  );

  assert.deepEqual(
    items.map((item) => item.sku),
    ["MILLE-WORK-ALL", "MESSE-KYRIE-ALL"],
  );
  assert.equal(items[1].addedAt, 3000);
});

test("un remplacement sans rien à couvrir se comporte comme un ajout", () => {
  const items = replaceInCart(cart(autreOeuvre), altoKyrie, 3000);

  assert.deepEqual(
    items.map((item) => item.sku),
    ["MILLE-WORK-ALL", "MESSE-KYRIE-ALTO"],
  );
});

test("remplacer par un produit déjà présent laisse le panier intact", () => {
  const before = cart(altoKyrie);
  const after = replaceInCart(before, altoKyrie, 3000);

  assert.equal(after, before);
});

test("retirer une ligne la sort du panier", () => {
  const items = removeFromCart(
    cart(altoKyrie, toutesVoixKyrie),
    "MESSE-KYRIE-ALTO",
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].sku, "MESSE-KYRIE-ALL");
});

test("retirer une référence absente ne fait rien", () => {
  const items = cart(altoKyrie);
  const after = removeFromCart(items, "REFERENCE-INCONNUE");

  assert.equal(after, items);
});

test("un produit déjà possédé est détecté puis retiré", () => {
  const items = cart(altoKyrie, autreOeuvre);
  const grants = [grant({ scope: "WORK", coverage: "ALL_VOICES" })];

  const owned = findOwnedItems(items, grants);
  assert.equal(owned.length, 1);
  assert.equal(owned[0].sku, "MESSE-KYRIE-ALTO");

  const remaining = removeOwnedItems(items, grants);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].sku, "MILLE-WORK-ALL");
});

test("un droit trop étroit ne fait pas retirer un pack plus large", () => {
  const items = cart(oeuvreComplete);
  const grants = [
    grant({ scope: "MOVEMENT", movementId: "kyrie", coverage: "ALL_VOICES" }),
  ];

  assert.deepEqual(findOwnedItems(items, grants), []);
  assert.equal(removeOwnedItems(items, grants), items);
});

test("sans aucun droit, rien n'est retiré du panier", () => {
  const items = cart(altoKyrie, oeuvreComplete);

  assert.deepEqual(findOwnedItems(items, []), []);
  assert.equal(removeOwnedItems(items, []), items);
});
