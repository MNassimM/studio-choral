import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NEW_WORK_DAYS,
  isNewWork,
  resolveWorkBadge,
} from "@/features/catalog/domain/work-badge";

console.log(
  "▶ src/features/catalog/domain/work-badge.ts — choix du badge d'une oeuvre",
);

const MAINTENANT = new Date("2026-09-12T12:00:00.000Z");
const daysAgo = (n: number) =>
  new Date(MAINTENANT.getTime() - n * 24 * 60 * 60 * 1000);

test("une oeuvre ajoutée aujourd'hui est une nouveauté", () => {
  assert.equal(isNewWork(MAINTENANT, MAINTENANT), true);
});

test("une oeuvre plus vieille que la fenêtre ne l'est plus", () => {
  assert.equal(isNewWork(daysAgo(NEW_WORK_DAYS), MAINTENANT), false);
  assert.equal(isNewWork(daysAgo(NEW_WORK_DAYS - 1), MAINTENANT), true);
});

test("une date future n'est pas une nouveauté", () => {
  assert.equal(isNewWork(daysAgo(-1), MAINTENANT), false);
});

test("la popularité passe devant la nouveauté", () => {
  const badge = resolveWorkBadge({
    mostPopular: true,
    publishedAt: MAINTENANT,
    now: MAINTENANT,
  });
  assert.equal(badge, "MOST_POPULAR");
});

test("une oeuvre récente et peu vue est une nouveauté", () => {
  const badge = resolveWorkBadge({
    mostPopular: false,
    publishedAt: daysAgo(2),
    now: MAINTENANT,
  });
  assert.equal(badge, "NEW");
});

test("une oeuvre ancienne et peu vue n'a aucun badge", () => {
  const badge = resolveWorkBadge({
    mostPopular: false,
    publishedAt: daysAgo(200),
    now: MAINTENANT,
  });
  assert.equal(badge, null);
});

test("une oeuvre jamais publiée n'est pas une nouveauté", () => {
  assert.equal(isNewWork(null, MAINTENANT), false);
  assert.equal(
    resolveWorkBadge({
      mostPopular: false,
      publishedAt: null,
      now: MAINTENANT,
    }),
    null,
  );
});

test("une oeuvre jamais publiée peut tout de même être populaire", () => {
  // Cas théorique : la popularité se lit sur les vues, pas sur la publication.
  assert.equal(
    resolveWorkBadge({ mostPopular: true, publishedAt: null, now: MAINTENANT }),
    "MOST_POPULAR",
  );
});
