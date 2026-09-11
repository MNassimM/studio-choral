import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CATALOG_PAGE_SIZE,
  clampPage,
  pageCount,
  pageWindow,
} from "@/lib/catalog/pagination";

console.log(
  "▶ src/lib/catalog/pagination.ts — nombre de pages, bornes et fenêtre de navigation",
);

test("la taille de page se divise par chaque nombre de colonnes de la grille", () => {
  for (const colonnes of [1, 2, 3, 4]) {
    assert.equal(CATALOG_PAGE_SIZE % colonnes, 0);
  }
});

test("le nombre de pages arrondit au supérieur", () => {
  assert.equal(pageCount(24), 1);
  assert.equal(pageCount(25), 2);
  assert.equal(pageCount(48), 2);
  assert.equal(pageCount(5, 2), 3);
});

test("sans résultat, le catalogue a tout de même une page", () => {
  assert.equal(pageCount(0), 1);
});

test("une page hors bornes est ramenée à la plus proche", () => {
  assert.equal(clampPage(40, 60), 3);
  assert.equal(clampPage(0, 60), 1);
  assert.equal(clampPage(2, 60), 2);
  assert.equal(clampPage(5, 0), 1);
});

test("une seule page ne propose qu'elle-même", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
});

test("peu de pages : toutes sont affichées, sans ellipse", () => {
  assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
});

test("en début de liste, une seule ellipse avant la dernière page", () => {
  assert.deepEqual(pageWindow(1, 12), [1, 2, "ellipsis", 12]);
});

test("au milieu, une ellipse de chaque côté", () => {
  assert.deepEqual(pageWindow(6, 12), [1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
});

test("en fin de liste, une seule ellipse après la première page", () => {
  assert.deepEqual(pageWindow(12, 12), [1, "ellipsis", 11, 12]);
});

test("une ellipse ne remplace jamais une seule page", () => {
  // Entre 1 et 3 il ne manque que 2 : on l'affiche plutôt qu'une ellipse.
  assert.deepEqual(pageWindow(4, 12), [1, 2, 3, 4, 5, "ellipsis", 12]);
  assert.deepEqual(pageWindow(9, 12), [1, "ellipsis", 8, 9, 10, 11, 12]);
});
