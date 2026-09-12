import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REFRESH_PUBLISHED_AT_ON_REPUBLISH,
  nextPublishedAt,
} from "@/lib/works/publication";

console.log("▶ src/lib/works/publication.ts — datation de la mise en vente");

const PREMIERE = new Date("2026-03-01T10:00:00.000Z");
const MAINTENANT = new Date("2026-09-12T12:00:00.000Z");

test("une première publication prend la date du jour", () => {
  assert.equal(
    nextPublishedAt(null, MAINTENANT).toISOString(),
    MAINTENANT.toISOString(),
  );
});

test("une republication suit le drapeau", () => {
  const obtenu = nextPublishedAt(PREMIERE, MAINTENANT);
  const attendu = REFRESH_PUBLISHED_AT_ON_REPUBLISH ? MAINTENANT : PREMIERE;
  assert.equal(obtenu.toISOString(), attendu.toISOString());
});

test("par défaut, la première date est conservée", () => {
  // Le test fige le réglage livré : le changer doit être un geste conscient.
  assert.equal(REFRESH_PUBLISHED_AT_ON_REPUBLISH, false);
  assert.equal(
    nextPublishedAt(PREMIERE, MAINTENANT).toISOString(),
    PREMIERE.toISOString(),
  );
});
