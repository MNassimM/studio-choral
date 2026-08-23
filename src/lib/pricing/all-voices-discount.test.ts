import { test } from "node:test";
import assert from "node:assert/strict";

import { computeAllVoicesDiscount } from "@/lib/pricing/all-voices-discount";

test("aucune voix possédée -> pas de remise", () => {
  const result = computeAllVoicesDiscount(
    { ownedUnits: 0, totalUnits: 24 },
    10000,
  );

  assert.equal(result.percentOff, 0);
  assert.equal(result.discountedCents, 10000);
  assert.equal(result.discountedCents, result.originalCents);
});

test("la moitié possédée -> -50%", () => {
  const result = computeAllVoicesDiscount(
    { ownedUnits: 12, totalUnits: 24 },
    10000,
  );

  assert.equal(result.percentOff, 50);
  assert.equal(result.discountedCents, 5000);
});

test("fraction non ronde (4/24) -> arrondi de la pastille, calcul depuis le ratio exact", () => {
  // Œuvre de 6 mouvements x 4 voix = 24 cellules ; Alto possédé sur 4
  // mouvements = 4 cellules = 16,67 % -> pastille "-17 %".
  const result = computeAllVoicesDiscount(
    { ownedUnits: 4, totalUnits: 24 },
    10000,
  );

  assert.equal(result.percentOff, 17);
  // Calcul exact depuis le ratio (20/24), pas depuis 17 % arrondi :
  // 10000 * 20 / 24 = 8333,33... -> arrondi à 8333, PAS 8300 (= 10000 * 0.83).
  assert.equal(result.discountedCents, 8333);
});

test("totalité déjà possédée -> remise à 100%, prix nul", () => {
  const result = computeAllVoicesDiscount(
    { ownedUnits: 24, totalUnits: 24 },
    10000,
  );

  assert.equal(result.percentOff, 100);
  assert.equal(result.discountedCents, 0);
});

test("œuvre à 6 voix (mouvement unique) : 3/6 possédées -> -50%", () => {
  const result = computeAllVoicesDiscount(
    { ownedUnits: 3, totalUnits: 6 },
    6000,
  );

  assert.equal(result.percentOff, 50);
  assert.equal(result.discountedCents, 3000);
});

test("discountedCents ne descend jamais sous 0", () => {
  const result = computeAllVoicesDiscount(
    { ownedUnits: 24, totalUnits: 24 },
    0,
  );

  assert.equal(result.discountedCents, 0);
});
