import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeAllVoicesDiscount,
  computeAllVoicesSaving,
} from "@/lib/pricing/all-voices-discount";

console.log(
  "▶ src/lib/pricing/all-voices-discount.ts — remise proportionnelle et économie du pack toutes voix",
);

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
  const result = computeAllVoicesDiscount(
    { ownedUnits: 4, totalUnits: 24 },
    10000,
  );

  assert.equal(result.percentOff, 17);
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

test("l'économie du pack toutes voix est la différence avec les pupitres", () => {
  assert.equal(computeAllVoicesSaving([190, 190, 190, 190], 390), 370);
});

test("un pack plus cher que la somme des pupitres n'économise rien", () => {
  assert.equal(computeAllVoicesSaving([100, 100], 500), 0);
});
