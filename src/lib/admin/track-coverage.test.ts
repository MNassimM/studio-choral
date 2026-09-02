import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeTrackCoverage,
  expectedTrackCount,
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
