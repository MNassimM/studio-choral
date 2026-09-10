import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeActivationPlan,
  computeMissingTracks,
  type ActivationAudioFile,
  type WorkActivationState,
} from "@/lib/admin/sellability/activation-plan";

/**
 * L'activation des offres, calculée sans base ni stockage.
 */

/** Les trois types qu'une offre par pupitre exige, pour un pupitre donné. */
function pistesDuPupitre(voiceId: string): ActivationAudioFile[] {
  return [
    { voiceId, type: "SOLO" },
    { voiceId, type: "PREDOMINANT" },
    { voiceId, type: "PREVIEW" },
  ];
}

/** La piste commune qu'une offre toutes voix exige en plus. */
const TUTTI: ActivationAudioFile = { voiceId: null, type: "TUTTI" };

test("une offre entièrement couverte reste active", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: pistesDuPupitre("v1") }],
    products: [{ id: "p1", movementId: "m1", voiceId: "v1", isActive: true }],
  };

  const plan = computeActivationPlan(work);

  assert.deepEqual(plan.activate, []);
  assert.deepEqual(plan.deactivate, []);
  assert.equal(plan.inactive, 0);
  assert.equal(plan.total, 1);
});

test("une offre partiellement couverte est désactivée", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    // Il manque la piste PREVIEW du pupitre.
    movements: [
      {
        id: "m1",
        audioFiles: [
          { voiceId: "v1", type: "SOLO" },
          { voiceId: "v1", type: "PREDOMINANT" },
        ],
      },
    ],
    products: [{ id: "p1", movementId: "m1", voiceId: "v1", isActive: true }],
  };

  const plan = computeActivationPlan(work);

  assert.deepEqual(plan.deactivate, ["p1"]);
  assert.equal(plan.inactive, 1);
});

test("une offre sans aucune piste est désactivée", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: [] }],
    products: [{ id: "p1", movementId: "m1", voiceId: "v1", isActive: true }],
  };

  assert.deepEqual(computeActivationPlan(work).deactivate, ["p1"]);
});

test("une piste ajoutée réactive une offre jusque là inactive", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: pistesDuPupitre("v1") }],
    products: [{ id: "p1", movementId: "m1", voiceId: "v1", isActive: false }],
  };

  const plan = computeActivationPlan(work);

  assert.deepEqual(plan.activate, ["p1"]);
  assert.deepEqual(plan.deactivate, []);
  assert.equal(plan.inactive, 0);
});

test("un pupitre retiré ne fait pas exiger ses pistes à l'offre toutes voix", () => {
  // C'est le bug qui a réellement eu lieu : l'alto a été retiré de la vente,
  // ses pistes n'existent plus, mais l'offre toutes voix les exigeait encore
  // et ne redevenait donc jamais vendable. La garantie tient au fait que les
  // pupitres du contexte viennent des OFFRES NON RETIREES, pas des pistes.
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: [...pistesDuPupitre("v1"), TUTTI] }],
    products: [
      // L'offre de l'alto a été retirée, elle n'entre pas dans l'état.
      { id: "p1", movementId: "m1", voiceId: "v1", isActive: true },
      { id: "all", movementId: "m1", voiceId: null, isActive: false },
    ],
  };

  const plan = computeActivationPlan(work);

  assert.deepEqual(plan.activate, ["all"]);
  assert.equal(plan.inactive, 0);
});

test("une offre toutes voix exige le tutti en plus des pupitres", () => {
  const sansTutti: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: pistesDuPupitre("v1") }],
    products: [{ id: "all", movementId: "m1", voiceId: null, isActive: true }],
  };

  assert.deepEqual(computeActivationPlan(sansTutti).deactivate, ["all"]);
});

test("un accompagnement déclaré est exigé de l'offre toutes voix", () => {
  const base = [...pistesDuPupitre("v1"), TUTTI];
  const products = [
    { id: "all", movementId: "m1", voiceId: null, isActive: true },
  ];

  const sansAccompagnement: WorkActivationState = {
    hasAccompaniment: true,
    movements: [{ id: "m1", audioFiles: base }],
    products,
  };
  assert.deepEqual(
    computeActivationPlan(sansAccompagnement).deactivate,
    ["all"],
    "l'accompagnement manque, l'offre doit tomber",
  );

  const avecAccompagnement: WorkActivationState = {
    hasAccompaniment: true,
    movements: [
      {
        id: "m1",
        audioFiles: [...base, { voiceId: null, type: "ACCOMPANIMENT" }],
      },
    ],
    products,
  };
  assert.deepEqual(computeActivationPlan(avecAccompagnement).deactivate, []);
});

test("une offre d'oeuvre entière exige tous les mouvements", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [
      { id: "m1", audioFiles: pistesDuPupitre("v1") },
      // Le second mouvement n'a rien.
      { id: "m2", audioFiles: [] },
    ],
    // movementId nul : l'offre porte sur l'oeuvre entière.
    products: [{ id: "p1", movementId: null, voiceId: "v1", isActive: true }],
  };

  assert.deepEqual(computeActivationPlan(work).deactivate, ["p1"]);
});

test("une oeuvre à mouvement unique se comporte comme les autres", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: [...pistesDuPupitre("v1"), TUTTI] }],
    products: [
      { id: "p1", movementId: null, voiceId: "v1", isActive: false },
      { id: "all", movementId: null, voiceId: null, isActive: false },
    ],
  };

  const plan = computeActivationPlan(work);

  assert.deepEqual(plan.activate.sort(), ["all", "p1"]);
  assert.equal(plan.inactive, 0);
});

test("une oeuvre sans aucune offre ne produit aucun changement", () => {
  const plan = computeActivationPlan({
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: [] }],
    products: [],
  });

  assert.deepEqual(plan, {
    activate: [],
    deactivate: [],
    inactive: 0,
    total: 0,
  });
});

test("le décompte des manques suit l'offre la plus incomplète", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [
      {
        id: "m1",
        audioFiles: [
          // Au pupitre v1 il ne manque que l'aperçu.
          { voiceId: "v1", type: "SOLO" },
          { voiceId: "v1", type: "PREDOMINANT" },
        ],
      },
    ],
    products: [
      { id: "p1", movementId: "m1", voiceId: "v1", isActive: true },
      // Au pupitre v2 il manque les trois.
      { id: "p2", movementId: "m1", voiceId: "v2", isActive: true },
    ],
  };

  assert.deepEqual(computeMissingTracks(work), {
    incompleteProducts: 2,
    missingCells: 3,
  });
});

test("une oeuvre complète ne manque de rien", () => {
  const work: WorkActivationState = {
    hasAccompaniment: false,
    movements: [{ id: "m1", audioFiles: [...pistesDuPupitre("v1"), TUTTI] }],
    products: [
      { id: "p1", movementId: "m1", voiceId: "v1", isActive: true },
      { id: "all", movementId: "m1", voiceId: null, isActive: true },
    ],
  };

  assert.deepEqual(computeMissingTracks(work), {
    incompleteProducts: 0,
    missingCells: 0,
  });
});
