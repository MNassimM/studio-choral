import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addToCart,
  clearCart,
  findOwnedItems,
  removeFromCart,
  removeOwnedItems,
  resolveCartLines,
} from "@/lib/cart/cart-rules";
import { cartItemToGrant } from "@/lib/cart/cart-item";
import type { CartItem, CartItemInput } from "@/lib/cart/types";
import type { Grant } from "@/types/domain";

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
  const lines = resolveCartLines([]);

  assert.deepEqual(lines, []);
  assert.deepEqual(clearCart(), []);
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

test("un produit ajouté après un autre qu'il couvre le marque absorbé", () => {
  const lines = resolveCartLines(cart(altoKyrie, toutesVoixKyrie));

  assert.equal(lines.length, 2);
  assert.equal(lines[0].absorbedBy, "MESSE-KYRIE-ALL");
  assert.equal(lines[1].absorbedBy, null);
});

test("un produit ajouté alors qu'un autre le couvre déjà est marqué absorbé", () => {
  const lines = resolveCartLines(cart(toutesVoixKyrie, altoKyrie));

  assert.equal(lines.length, 2);
  assert.equal(lines[0].absorbedBy, null);
  assert.equal(lines[1].absorbedBy, "MESSE-KYRIE-ALL");
});

test("une ligne absorbée reste dans le panier", () => {
  const items = cart(altoKyrie, toutesVoixKyrie);

  assert.equal(items.length, 2);
  assert.ok(items.some((item) => item.sku === "MESSE-KYRIE-ALTO"));
});

test("le pack de l'œuvre entière absorbe toutes les lignes de cette œuvre", () => {
  const lines = resolveCartLines(
    cart(altoKyrie, toutesVoixKyrie, oeuvreComplete),
  );

  assert.equal(lines[0].absorbedBy, "MESSE-KYRIE-ALL");
  assert.equal(lines[1].absorbedBy, "MESSE-WORK-ALL");
  assert.equal(lines[2].absorbedBy, null);
});

test("une autre œuvre n'absorbe jamais les lignes de la première", () => {
  const lines = resolveCartLines(cart(altoKyrie, autreOeuvre));

  assert.equal(lines[0].absorbedBy, null);
  assert.equal(lines[1].absorbedBy, null);
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
