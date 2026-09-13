import { test } from "node:test";
import assert from "node:assert/strict";

import { startOfUtcDay } from "@/features/work/domain/view-day";

console.log(
  "▶ src/features/work/domain/view-day.ts — bornes du jour de comptage",
);

test("un instant est ramené à minuit UTC du même jour", () => {
  const jour = startOfUtcDay(new Date("2026-09-12T17:42:31.500Z"));
  assert.equal(jour.toISOString(), "2026-09-12T00:00:00.000Z");
});

test("minuit UTC est son propre début de jour", () => {
  const jour = startOfUtcDay(new Date("2026-09-12T00:00:00.000Z"));
  assert.equal(jour.toISOString(), "2026-09-12T00:00:00.000Z");
});

test("la découpe suit UTC, pas le fuseau du serveur", () => {
  // 23 h 30 à Paris en été, soit le lendemain 21 h 30 UTC : même jour UTC.
  const jour = startOfUtcDay(new Date("2026-09-12T21:30:00.000Z"));
  assert.equal(jour.toISOString(), "2026-09-12T00:00:00.000Z");
});

test("une vue juste avant minuit UTC compte pour la veille", () => {
  const veille = startOfUtcDay(new Date("2026-09-12T23:59:59.999Z"));
  const lendemain = startOfUtcDay(new Date("2026-09-13T00:00:00.000Z"));
  assert.equal(veille.toISOString(), "2026-09-12T00:00:00.000Z");
  assert.notEqual(veille.getTime(), lendemain.getTime());
});
