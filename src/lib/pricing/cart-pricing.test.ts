import { test } from "node:test";
import assert from "node:assert/strict";

import {
  coveredCells,
  measureCoverage,
  priceCart,
  unionOfCoveredCells,
  type PricedProduct,
} from "@/lib/pricing/cart-pricing";
import type { Grant, WorkAccessInput } from "@/types/domain";

console.log(
  "▶ src/lib/pricing/cart-pricing.ts — tarification du panier : cellules, union et remises",
);

const SATB = ["S", "A", "T", "B"];

const LAYOUT: WorkAccessInput = {
  id: "w",
  movements: [
    { id: "m1", voiceCodes: SATB },
    { id: "m2", voiceCodes: SATB },
  ],
};

const LAYOUTS = new Map([[LAYOUT.id, LAYOUT]]);

function product(
  over: Partial<PricedProduct> & { sku: string },
): PricedProduct {
  return {
    workId: "w",
    movementId: null,
    voiceCode: null,
    scope: "WORK",
    coverage: "ALL_VOICES",
    name: over.sku,
    priceCents: 4000,
    currency: "EUR",
    ...over,
  };
}

function catalogue(...items: PricedProduct[]): Map<string, PricedProduct> {
  return new Map(items.map((item) => [item.sku, item]));
}

test("un pack toutes voix oeuvre entière couvre toutes les cellules", () => {
  const cells = coveredCells(
    {
      workId: "w",
      movementId: null,
      voiceCode: null,
      scope: "WORK",
      coverage: "ALL_VOICES",
    },
    LAYOUT,
  );

  assert.equal(cells.length, 8);
  assert.equal(new Set(cells).size, 8);
});

test("une voix seule sur l'oeuvre couvre une cellule par mouvement", () => {
  const cells = coveredCells(
    {
      workId: "w",
      movementId: null,
      voiceCode: "A",
      scope: "WORK",
      coverage: "SINGLE_VOICE",
    },
    LAYOUT,
  );

  assert.equal(cells.length, 2);
});

test("des coordonnées d'une autre oeuvre ne couvrent rien", () => {
  const cells = coveredCells(
    {
      workId: "autre",
      movementId: null,
      voiceCode: null,
      scope: "WORK",
      coverage: "ALL_VOICES",
    },
    LAYOUT,
  );

  assert.deepEqual(cells, []);
});

test("l'union ne compte pas deux fois une cellule couverte par deux sources", () => {
  const cells = unionOfCoveredCells(
    [
      {
        workId: "w",
        movementId: null,
        voiceCode: "A",
        scope: "WORK",
        coverage: "SINGLE_VOICE",
      },
      {
        workId: "w",
        movementId: "m1",
        voiceCode: null,
        scope: "MOVEMENT",
        coverage: "ALL_VOICES",
      },
    ],
    LAYOUTS,
  );

  // 2 cellules alto, 4 cellules du mouvement 1, dont (m1, A) commune.
  assert.equal(cells.size, 5);
});

test("sans droit ni autre article, le pack est au prix catalogue", () => {
  const pack = product({ sku: "pack" });
  const result = priceCart({
    skus: ["pack"],
    products: catalogue(pack),
    layouts: LAYOUTS,
    grants: [],
  });

  assert.equal(result.lines[0]?.discount, null);
  assert.equal(result.totalCents, 4000);
});

test("la remise combine droits détenus et autres articles du panier, sans doublon", () => {
  const pack = product({ sku: "pack" });
  const soprano = product({
    sku: "soprano",
    voiceCode: "S",
    coverage: "SINGLE_VOICE",
    priceCents: 1000,
  });
  const m1 = product({
    sku: "m1-toutes",
    movementId: "m1",
    scope: "MOVEMENT",
    priceCents: 2000,
  });

  const grants: Grant[] = [
    {
      workId: "w",
      movementId: null,
      voiceCode: "A",
      scope: "WORK",
      coverage: "SINGLE_VOICE",
    },
  ];

  const result = priceCart({
    skus: ["pack", "soprano", "m1-toutes"],
    products: catalogue(pack, soprano, m1),
    layouts: LAYOUTS,
    grants,
  });

  // Droits : (m1,A) (m2,A). Panier : (m1,S) (m2,S) puis (m1,S) (m1,A) (m1,T) (m1,B).
  // Union sur les 8 cellules du pack : 6 couvertes, il reste (m2,T) et (m2,B).
  const packLine = result.lines[0];
  assert.equal(packLine?.discount?.ownedUnits, 6);
  assert.equal(packLine?.discount?.totalUnits, 8);
  assert.equal(packLine?.discount?.percentOff, 75);
  assert.equal(packLine?.payableCents, 1000);
});

test("un article absent du catalogue est marqué indisponible et exclu du total", () => {
  const pack = product({ sku: "pack" });
  const result = priceCart({
    skus: ["pack", "disparu"],
    products: catalogue(pack),
    layouts: LAYOUTS,
    grants: [],
  });

  const disparu = result.lines[1];
  assert.equal(disparu?.unavailable, true);
  assert.equal(disparu?.name, null);
  assert.equal(disparu?.priceCents, null);
  assert.equal(result.totalCents, 4000);
  assert.equal(result.unavailableCount, 1);
});

test("un pack entièrement couvert tombe à zéro sans passer sous zéro", () => {
  const pack = product({ sku: "pack" });
  const grants: Grant[] = [
    {
      workId: "w",
      movementId: null,
      voiceCode: null,
      scope: "WORK",
      coverage: "ALL_VOICES",
    },
  ];

  const result = priceCart({
    skus: ["pack"],
    products: catalogue(pack),
    layouts: LAYOUTS,
    grants,
  });

  assert.equal(result.lines[0]?.discount?.percentOff, 100);
  assert.equal(result.lines[0]?.payableCents, 0);
  assert.equal(result.totalCents, 0);
});

test("une voix seule ne reçoit jamais de remise", () => {
  const soprano = product({
    sku: "soprano",
    voiceCode: "S",
    coverage: "SINGLE_VOICE",
    priceCents: 1000,
  });
  const grants: Grant[] = [
    {
      workId: "w",
      movementId: "m1",
      voiceCode: "S",
      scope: "MOVEMENT",
      coverage: "SINGLE_VOICE",
    },
  ];

  const result = priceCart({
    skus: ["soprano"],
    products: catalogue(soprano),
    layouts: LAYOUTS,
    grants,
  });

  assert.equal(result.lines[0]?.discount, null);
  assert.equal(result.totalCents, 1000);
});

test("la mesure compte les cellules du produit et celles déjà couvertes", () => {
  const pack = {
    workId: "w",
    movementId: null,
    voiceCode: null,
    scope: "WORK" as const,
    coverage: "ALL_VOICES" as const,
  };
  const alto = {
    workId: "w",
    movementId: null,
    voiceCode: "A",
    scope: "WORK" as const,
    coverage: "SINGLE_VOICE" as const,
  };

  assert.deepEqual(measureCoverage(pack, LAYOUTS, [alto]), {
    ownedUnits: 2,
    totalUnits: 8,
  });
});

test("la mesure d'un mouvement ne compte que les cellules de ce mouvement", () => {
  const packM1 = {
    workId: "w",
    movementId: "m1",
    voiceCode: null,
    scope: "MOVEMENT" as const,
    coverage: "ALL_VOICES" as const,
  };
  const altoOeuvre = {
    workId: "w",
    movementId: null,
    voiceCode: "A",
    scope: "WORK" as const,
    coverage: "SINGLE_VOICE" as const,
  };

  assert.deepEqual(measureCoverage(packM1, LAYOUTS, [altoOeuvre]), {
    ownedUnits: 1,
    totalUnits: 4,
  });
});

test("une oeuvre inconnue ne mesure rien", () => {
  const ailleurs = {
    workId: "autre",
    movementId: null,
    voiceCode: null,
    scope: "WORK" as const,
    coverage: "ALL_VOICES" as const,
  };

  assert.deepEqual(measureCoverage(ailleurs, LAYOUTS, []), {
    ownedUnits: 0,
    totalUnits: 0,
  });
});
