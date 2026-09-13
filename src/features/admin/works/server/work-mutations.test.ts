import { test } from "node:test";
import assert from "node:assert/strict";

import {
  planMovements,
  planProducts,
  planRetiredVoiceTracks,
  type ExistingProduct,
  type ProductRow,
} from "@/features/admin/works/server/work-mutations";

console.log(
  "▶ src/features/admin/works/server/work-mutations.ts — le plan de changement : mouvements, offres, purge des pistes",
);

/**
 * Le calcul du plan de changement, sans base ni stockage.
 */

// ─── Mouvements ──────────────────────────────────────────────────────────────

test("un mouvement absent du brouillon part en doomed", () => {
  const plan = planMovements(
    [
      { id: "m1", title: "Kyrie" },
      { id: "m2", title: "Gloria" },
    ],
    [{ id: "m1", title: "Kyrie" }],
    ["kyrie"],
  );

  assert.deepEqual(plan.doomed, [{ id: "m2", title: "Gloria" }]);
});

test("un mouvement sans id est une création, avec id une mise à jour", () => {
  const plan = planMovements(
    [{ id: "m1", title: "Kyrie" }],
    [{ id: "m1", title: "Kyrie" }, { title: "Gloria" }],
    ["kyrie", "gloria"],
  );

  assert.deepEqual(plan.updates, [
    { id: "m1", slug: "kyrie", title: "Kyrie", position: 0 },
  ]);
  assert.deepEqual(plan.creations, [
    { slug: "gloria", title: "Gloria", position: 1 },
  ]);
});

test("la position finale suit l'ordre du brouillon", () => {
  const plan = planMovements(
    [
      { id: "m1", title: "Kyrie" },
      { id: "m2", title: "Gloria" },
    ],
    [
      { id: "m2", title: "Gloria" },
      { id: "m1", title: "Kyrie" },
    ],
    ["gloria", "kyrie"],
  );

  assert.deepEqual(
    plan.updates.map((etape) => [etape.id, etape.position]),
    [
      ["m2", 0],
      ["m1", 1],
    ],
  );
});

test("le parking donne des positions négatives, distinctes des finales", () => {
  const plan = planMovements(
    [
      { id: "m1", title: "Kyrie" },
      { id: "m2", title: "Gloria" },
    ],
    [
      { id: "m2", title: "Gloria" },
      { id: "m1", title: "Kyrie" },
    ],
    ["gloria", "kyrie"],
  );

  const garees = plan.parking.map((etape) => etape.position);
  assert.deepEqual(garees, [-1, -2]);
  // Aucune position temporaire ne peut heurter une position finale, qui part
  // de zéro : c'est ce qui rend le réordonnancement possible malgré l'unique.
  const finales = plan.updates.map((etape) => etape.position);
  assert.equal(
    garees.some((position) => finales.includes(position)),
    false,
  );
  assert.equal(new Set(plan.parking.map((etape) => etape.slug)).size, 2);
});

test("un mouvement ajouté seul ne gare rien", () => {
  const plan = planMovements([], [{ title: "Kyrie" }], ["kyrie"]);

  assert.deepEqual(plan.parking, []);
  assert.deepEqual(plan.doomed, []);
  assert.equal(plan.creations.length, 1);
});

// ─── Offres ──────────────────────────────────────────────────────────────────

/** Fabrique une offre engendrée, réduite à ce que le plan regarde. */
function offer(
  sku: string,
  movementId: string | null,
  voiceId: string | null,
  coverage: "SINGLE_VOICE" | "ALL_VOICES",
  position: number,
): ProductRow {
  return {
    sku,
    name: sku,
    movementId,
    voiceId,
    scope: movementId ? "MOVEMENT" : "WORK",
    coverage,
    priceCents: 500,
    position,
  };
}

test("une offre qui n'est plus engendrée est retirée, jamais supprimée", () => {
  const existing: ExistingProduct[] = [
    { id: "p1", movementId: null, voiceId: "v1", coverage: "SINGLE_VOICE" },
    { id: "p2", movementId: null, voiceId: "v2", coverage: "SINGLE_VOICE" },
  ];

  const plan = planProducts(existing, [
    offer("a", null, "v1", "SINGLE_VOICE", 0),
  ]);

  assert.deepEqual(plan.retiredIds, ["p2"]);
});

test("une offre déjà présente est mise à jour, pas recréée", () => {
  const existing: ExistingProduct[] = [
    { id: "p1", movementId: null, voiceId: "v1", coverage: "SINGLE_VOICE" },
  ];

  const plan = planProducts(existing, [
    offer("a", null, "v1", "SINGLE_VOICE", 3),
  ]);

  assert.deepEqual(plan.updates, [
    { id: "p1", name: "a", priceCents: 500, position: 3 },
  ]);
  assert.deepEqual(plan.creations, []);
  assert.deepEqual(plan.retiredIds, []);
});

test("une offre inconnue est créée", () => {
  const plan = planProducts([], [offer("a", "m1", "v1", "SINGLE_VOICE", 0)]);

  assert.equal(plan.creations.length, 1);
  assert.equal(plan.creations[0].sku, "a");
  assert.deepEqual(plan.updates, []);
});

test("deux offres de mêmes coordonnées mais de couverture différente ne se confondent pas", () => {
  const existing: ExistingProduct[] = [
    { id: "p1", movementId: "m1", voiceId: null, coverage: "ALL_VOICES" },
  ];

  // Même mouvement, même absence de pupitre, mais couverture SINGLE_VOICE :
  // c'est une autre offre, celle en base doit être retirée.
  const plan = planProducts(existing, [
    offer("a", "m1", null, "SINGLE_VOICE", 0),
  ]);

  assert.deepEqual(plan.retiredIds, ["p1"]);
  assert.equal(plan.creations.length, 1);
});

// ─── Pistes d'un pupitre retiré ──────────────────────────────────────────────

test("une piste d'un pupitre retiré part, ligne et clé", () => {
  const plan = planRetiredVoiceTracks(
    [
      { id: "a1", storageKey: "works/w/soprano.wav", voiceId: "v1" },
      { id: "a2", storageKey: "works/w/alto.wav", voiceId: "v2" },
    ],
    ["v1"],
  );

  assert.deepEqual(
    plan.doomed.map((piste) => piste.id),
    ["a2"],
  );
  assert.deepEqual(plan.voiceIds, ["v2"]);
});

test("une piste sans pupitre n'est JAMAIS emportée", () => {
  // Le cas que le notIn SQL aurait silencieusement détruit : un tutti et un
  // accompagnement portent voiceId nul, ils n'appartiennent à aucun pupitre.
  const plan = planRetiredVoiceTracks(
    [
      { id: "tutti", storageKey: "works/w/tutti.wav", voiceId: null },
      { id: "piano", storageKey: "works/w/piano.wav", voiceId: null },
      { id: "alto", storageKey: "works/w/alto.wav", voiceId: "v2" },
    ],
    ["v1"],
  );

  assert.deepEqual(
    plan.doomed.map((piste) => piste.id),
    ["alto"],
  );
});

test("les pupitres à purger sont dédoublonnés", () => {
  const plan = planRetiredVoiceTracks(
    [
      { id: "a1", storageKey: "k1", voiceId: "v2" },
      { id: "a2", storageKey: "k2", voiceId: "v2" },
      { id: "a3", storageKey: "k3", voiceId: "v3" },
    ],
    [],
  );

  assert.deepEqual(plan.voiceIds, ["v2", "v3"]);
  assert.equal(plan.doomed.length, 3);
});

test("rien ne part quand tous les pupitres sont retenus", () => {
  const plan = planRetiredVoiceTracks(
    [
      { id: "a1", storageKey: "k1", voiceId: "v1" },
      { id: "a2", storageKey: "k2", voiceId: null },
    ],
    ["v1"],
  );

  assert.deepEqual(plan.doomed, []);
  assert.deepEqual(plan.voiceIds, []);
});
