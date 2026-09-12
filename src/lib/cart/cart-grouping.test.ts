import { test } from "node:test";
import assert from "node:assert/strict";

import { groupCartLines } from "@/lib/cart/cart-grouping";
import type { ResolvedCartLine } from "@/lib/cart/resolved-cart";
import type { CartItem } from "@/lib/cart/types";

console.log(
  "▶ src/lib/cart/cart-grouping.ts — regroupement des lignes du panier par œuvre puis mouvement",
);

function line(over: Partial<CartItem> & { sku: string }): CartItem {
  return {
    workId: "w1",
    movementId: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    addedAt: 0,
    ...over,
  };
}

function resolved(
  over: Partial<ResolvedCartLine> & { sku: string },
): ResolvedCartLine {
  return {
    name: over.sku,
    workId: "w1",
    workTitle: "Oeuvre 1",
    workComposer: "Compositeur 1",
    workCoverUrl: null,
    voiceLabel: "Toutes les voix",
    movementId: null,
    movementTitle: null,
    workMovementCount: 1,
    priceCents: 1000,
    currency: "EUR",
    discount: null,
    payableCents: 1000,
    unavailable: false,
    ...over,
  };
}

test("les lignes d'oeuvres différentes forment des groupes distincts", () => {
  const lines = [line({ sku: "a" }), line({ sku: "b", workId: "w2" })];
  const map = new Map([
    ["a", resolved({ sku: "a" })],
    ["b", resolved({ sku: "b", workId: "w2", workTitle: "Oeuvre 2" })],
  ]);

  const groups = groupCartLines(lines, map);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => group.workTitle),
    ["Oeuvre 1", "Oeuvre 2"],
  );
});

test("une oeuvre à un seul mouvement n'est pas subdivisée", () => {
  const lines = [line({ sku: "a", movementId: "m1", scope: "MOVEMENT" })];
  const map = new Map([
    ["a", resolved({ sku: "a", movementId: "m1", movementTitle: "Kyrie" })],
  ]);

  const groups = groupCartLines(lines, map);

  assert.equal(groups[0]?.splitByMovement, false);
  assert.equal(groups[0]?.groups.length, 1);
});

test("une oeuvre à plusieurs mouvements est subdivisée par mouvement", () => {
  const lines = [
    line({ sku: "a", movementId: "m1", scope: "MOVEMENT" }),
    line({ sku: "b", movementId: "m2", scope: "MOVEMENT" }),
    line({ sku: "c" }),
  ];
  const map = new Map([
    [
      "a",
      resolved({
        sku: "a",
        movementId: "m1",
        movementTitle: "Kyrie",
        workMovementCount: 6,
      }),
    ],
    [
      "b",
      resolved({
        sku: "b",
        movementId: "m2",
        movementTitle: "Gloria",
        workMovementCount: 6,
      }),
    ],
    ["c", resolved({ sku: "c", workMovementCount: 6 })],
  ]);

  const groups = groupCartLines(lines, map);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.splitByMovement, true);
  assert.deepEqual(
    groups[0]?.groups.map((group) => group.movementTitle),
    ["Kyrie", "Gloria", null],
  );
});

test("sans résolution, le regroupement retombe sur les coordonnées stockées", () => {
  const lines = [line({ sku: "a" }), line({ sku: "b", workId: "w2" })];

  const groups = groupCartLines(lines, new Map());

  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.workTitle, null);
});
