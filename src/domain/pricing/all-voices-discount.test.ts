import { test } from "node:test";
import assert from "node:assert/strict";

import { computeAllVoicesDiscount } from "@/domain/pricing/all-voices-discount";

console.log(
  "▶ src/domain/pricing/all-voices-discount.ts — remise proportionnelle défalquant ce qui est déjà possédé",
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

test("prendre l'offre toutes voix ou les pupitres restants coûte le même prix", () => {
  // L'offre toutes voix vaut exactement la somme de ses pupitres, elle ne fait
  // économiser rien. La remise doit donc ramener son prix à celui des seules
  // cellules encore à acheter, sinon l'un des deux chemins coûterait plus cher.
  const pupitre = 190;
  const toutesVoix = pupitre * 4;

  const { discountedCents } = computeAllVoicesDiscount(
    { ownedUnits: 2, totalUnits: 4 },
    toutesVoix,
  );

  assert.equal(discountedCents, pupitre * 2);
});
