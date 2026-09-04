import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PER_VOICE_TYPES,
  computeTrackCoverage,
  expectedTrackCount,
  isProductCovered,
  productCoverageGap,
  requiredCellsFor,
} from "@/lib/admin/track-coverage";

test("un mouvement SATB sans accompagnement attend treize pistes", () => {
  assert.equal(
    expectedTrackCount({
      movementCount: 1,
      voiceCount: 4,
      hasAccompaniment: false,
    }),
    13,
  );
});

test("l'accompagnement ajoute une piste par mouvement", () => {
  assert.equal(
    expectedTrackCount({
      movementCount: 6,
      voiceCount: 4,
      hasAccompaniment: true,
    }),
    84,
  );
});

test("une oeuvre sans mouvement n'attend rien", () => {
  assert.equal(
    expectedTrackCount({
      movementCount: 0,
      voiceCount: 4,
      hasAccompaniment: true,
    }),
    0,
  );
});

test("aucune piste importée donne l'état vide", () => {
  const coverage = computeTrackCoverage(
    { movementCount: 1, voiceCount: 4, hasAccompaniment: false },
    0,
  );

  assert.equal(coverage.state, "empty");
  assert.equal(coverage.missing, 13);
  assert.equal(coverage.ratio, 0);
});

test("toutes les pistes importées donnent l'état complet", () => {
  const coverage = computeTrackCoverage(
    { movementCount: 6, voiceCount: 4, hasAccompaniment: true },
    84,
  );

  assert.equal(coverage.state, "complete");
  assert.equal(coverage.missing, 0);
  assert.equal(coverage.ratio, 1);
});

test("un import incomplet donne l'état partiel et le reste à faire", () => {
  const coverage = computeTrackCoverage(
    { movementCount: 6, voiceCount: 4, hasAccompaniment: true },
    60,
  );

  assert.equal(coverage.state, "partial");
  assert.equal(coverage.missing, 24);
  assert.ok(coverage.ratio > 0.71 && coverage.ratio < 0.72);
});

test("un surplus de pistes ne rend jamais un manque négatif", () => {
  const coverage = computeTrackCoverage(
    { movementCount: 1, voiceCount: 4, hasAccompaniment: false },
    20,
  );

  assert.equal(coverage.missing, 0);
  assert.equal(coverage.ratio, 1);
  assert.equal(coverage.state, "complete");
});

test("rien d'attendu et rien d'importé ne divise pas par zéro", () => {
  const coverage = computeTrackCoverage(
    { movementCount: 0, voiceCount: 0, hasAccompaniment: false },
    0,
  );

  assert.equal(coverage.ratio, 0);
  assert.equal(coverage.state, "empty");
});

// Oeuvre de test : 2 mouvements, 2 pupitres, sans accompagnement.
const M1 = "mvt-1";
const M2 = "mvt-2";
const SOP = "voix-sop";
const ALT = "voix-alt";
const CONTEXTE = {
  movementIds: [M1, M2],
  voiceIds: [SOP, ALT],
  hasAccompaniment: false,
};

/** Toutes les cases d'un pupitre sur un mouvement. */
function pupitre(movementId: string, voiceId: string) {
  return PER_VOICE_TYPES.map((type) => ({ movementId, voiceId, type }));
}

/** Le tutti d'un mouvement. */
function tutti(movementId: string) {
  return [{ movementId, voiceId: null, type: "TUTTI" as const }];
}

test("un produit mouvement une voix exige les trois types de ce pupitre", () => {
  const produit = { movementId: M1, voiceId: SOP };
  assert.equal(requiredCellsFor(produit, CONTEXTE).length, 3);
  assert.equal(isProductCovered(produit, CONTEXTE, pupitre(M1, SOP)), true);
});

test("il manque un seul type et le produit n'est plus couvert", () => {
  const produit = { movementId: M1, voiceId: SOP };
  const partiel = pupitre(M1, SOP).slice(0, 2);
  assert.equal(isProductCovered(produit, CONTEXTE, partiel), false);
  assert.equal(productCoverageGap(produit, CONTEXTE, partiel).missing, 1);
});

test("l'aperçu compte dans la couverture", () => {
  const produit = { movementId: M1, voiceId: SOP };
  const sansApercu = pupitre(M1, SOP).filter((cell) => cell.type !== "PREVIEW");
  assert.equal(isProductCovered(produit, CONTEXTE, sansApercu), false);
});

test("un produit sans aucune piste n'est pas couvert", () => {
  assert.equal(
    isProductCovered({ movementId: M1, voiceId: SOP }, CONTEXTE, []),
    false,
  );
});

test("un produit mouvement toutes voix exige les deux pupitres plus le tutti", () => {
  const produit = { movementId: M1, voiceId: null };
  const requises = requiredCellsFor(produit, CONTEXTE);
  assert.equal(requises.length, 7);

  const completes = [...pupitre(M1, SOP), ...pupitre(M1, ALT), ...tutti(M1)];
  assert.equal(isProductCovered(produit, CONTEXTE, completes), true);
  assert.equal(
    isProductCovered(produit, CONTEXTE, [...pupitre(M1, SOP), ...tutti(M1)]),
    false,
  );
});

test("l'accompagnement n'est exigé que si l'oeuvre le déclare", () => {
  const produit = { movementId: M1, voiceId: null };
  const avec = { ...CONTEXTE, hasAccompaniment: true };
  assert.equal(requiredCellsFor(produit, avec).length, 8);

  const sansAccomp = [...pupitre(M1, SOP), ...pupitre(M1, ALT), ...tutti(M1)];
  assert.equal(isProductCovered(produit, avec, sansAccomp), false);
  assert.equal(
    isProductCovered(produit, avec, [
      ...sansAccomp,
      { movementId: M1, voiceId: null, type: "ACCOMPANIMENT" },
    ]),
    true,
  );
});

test("un produit oeuvre une voix exige tous les mouvements", () => {
  const produit = { movementId: null, voiceId: SOP };
  assert.equal(requiredCellsFor(produit, CONTEXTE).length, 6);
  assert.equal(isProductCovered(produit, CONTEXTE, pupitre(M1, SOP)), false);
  assert.equal(
    isProductCovered(produit, CONTEXTE, [
      ...pupitre(M1, SOP),
      ...pupitre(M2, SOP),
    ]),
    true,
  );
});

test("un produit oeuvre toutes voix exige tout, partout", () => {
  const produit = { movementId: null, voiceId: null };
  assert.equal(requiredCellsFor(produit, CONTEXTE).length, 14);

  const tout = [
    ...pupitre(M1, SOP),
    ...pupitre(M1, ALT),
    ...tutti(M1),
    ...pupitre(M2, SOP),
    ...pupitre(M2, ALT),
    ...tutti(M2),
  ];
  assert.equal(isProductCovered(produit, CONTEXTE, tout), true);
});

test("une oeuvre à mouvement unique se couvre sur ce seul mouvement", () => {
  const mono = { movementIds: [M1], voiceIds: [SOP], hasAccompaniment: false };
  const produit = { movementId: null, voiceId: SOP };
  assert.equal(requiredCellsFor(produit, mono).length, 3);
  assert.equal(isProductCovered(produit, mono, pupitre(M1, SOP)), true);
});

test("un pupitre ajouté sans piste rend ses offres non couvertes", () => {
  const TEN = "voix-ten";
  const elargi = { ...CONTEXTE, voiceIds: [SOP, ALT, TEN] };
  const existantes = [
    ...pupitre(M1, SOP),
    ...pupitre(M1, ALT),
    ...tutti(M1),
    ...pupitre(M2, SOP),
    ...pupitre(M2, ALT),
    ...tutti(M2),
  ];

  // Le nouveau pupitre n'a rien, ses offres tombent.
  assert.equal(
    isProductCovered({ movementId: M1, voiceId: TEN }, elargi, existantes),
    false,
  );
  // Et l'offre toutes voix aussi, puisqu'elle doit désormais le couvrir.
  assert.equal(
    isProductCovered({ movementId: null, voiceId: null }, elargi, existantes),
    false,
  );
  // Les offres des pupitres déjà complets ne bougent pas.
  assert.equal(
    isProductCovered({ movementId: M1, voiceId: SOP }, elargi, existantes),
    true,
  );
});

test("une piste ajoutée réactive un produit jusque là non couvert", () => {
  const produit = { movementId: M1, voiceId: SOP };
  const partiel = pupitre(M1, SOP).slice(0, 2);
  assert.equal(isProductCovered(produit, CONTEXTE, partiel), false);

  const complet = [
    ...partiel,
    { movementId: M1, voiceId: SOP, type: "PREVIEW" as const },
  ];
  assert.equal(isProductCovered(produit, CONTEXTE, complet), true);
});

test("un contexte sans mouvement ne couvre rien", () => {
  const vide = { movementIds: [], voiceIds: [SOP], hasAccompaniment: false };
  assert.equal(
    isProductCovered({ movementId: null, voiceId: SOP }, vide, []),
    false,
  );
});
