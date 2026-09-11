import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_QUERY_LENGTH,
  catalogHref,
  catalogQueryForPage,
  parseCatalogParams,
  parseMultiValueParam,
  parsePage,
  parseQuery,
  parseSort,
  isPeriodValue,
} from "@/lib/catalog/catalog-params";

console.log(
  "▶ src/lib/catalog/catalog-params.ts — lecture et validation des paramètres d'URL du catalogue",
);

test("la recherche est nettoyée de ses blancs de bord", () => {
  assert.equal(parseQuery("  messe  "), "messe");
  assert.equal(parseQuery("   "), "");
  assert.equal(parseQuery(undefined), "");
});

test("une recherche répétée dans l'URL est ignorée, comme avant", () => {
  assert.equal(parseQuery(["messe", "gloria"]), "");
});

test("une recherche trop longue est tronquée", () => {
  assert.equal(parseQuery("a".repeat(500)).length, MAX_QUERY_LENGTH);
});

test("les caractères spéciaux de la recherche sont conservés tels quels", () => {
  // L'échappement pour ILIKE se fait au moment de la requête, pas ici.
  assert.equal(parseQuery("100%_\\"), "100%_\\");
});

test("un tri connu est retenu, tout autre revient au tri par défaut", () => {
  assert.equal(parseSort("price-asc"), "price-asc");
  assert.equal(parseSort("inconnu"), "featured");
  assert.equal(parseSort(undefined), "featured");
  assert.equal(parseSort(["price-asc"]), "featured");
});

test("une page valide est lue comme un entier", () => {
  assert.equal(parsePage("2"), 2);
  assert.equal(parsePage("40"), 40);
  assert.equal(parsePage("03"), 3);
});

test("toute page invalide vaut 1, sans erreur", () => {
  for (const raw of ["abc", "0", "-2", "2.5", "", " 2", "1e3", undefined]) {
    assert.equal(parsePage(raw), 1, `${String(raw)} aurait dû valoir 1`);
  }
  assert.equal(parsePage(["2"]), 1);
  assert.equal(parsePage("99999999999999999999"), 1);
});

test("un filtre multivalué garde les valeurs valides, sans doublon, dans l'ordre", () => {
  assert.deepEqual(
    parseMultiValueParam(
      " BAROQUE ,RENAISSANCE,BAROQUE,INCONNUE",
      isPeriodValue,
    ),
    ["BAROQUE", "RENAISSANCE"],
  );
  assert.deepEqual(parseMultiValueParam("", isPeriodValue), []);
  assert.deepEqual(parseMultiValueParam(["BAROQUE"], isPeriodValue), []);
});

test("formations et langues ne sont acceptées que si elles existent en base", () => {
  const params = parseCatalogParams(
    {
      q: " mai ",
      sort: "title-asc",
      page: "3",
      period: "RENAISSANCE,INCONNUE",
      voicing: "SATB,XYZ",
      language: "fr,klingon",
    },
    { voicings: ["SATB"], languages: ["fr", "la"] },
  );

  assert.deepEqual(params, {
    q: "mai",
    sort: "title-asc",
    page: 3,
    periods: ["RENAISSANCE"],
    voicings: ["SATB"],
    languages: ["fr"],
  });
});

test("un lien de page ne remplace que la page, tout le reste est conservé", () => {
  assert.deepEqual(
    catalogQueryForPage(
      { q: "messe", sort: "price-asc", period: "BAROQUE", page: "2" },
      3,
    ),
    { q: "messe", sort: "price-asc", period: "BAROQUE", page: "3" },
  );
});

test("la première page n'écrit pas page=1", () => {
  assert.deepEqual(catalogQueryForPage({ q: "messe", page: "4" }, 1), {
    q: "messe",
  });
  assert.deepEqual(catalogQueryForPage({}, 1), {});
});

test("un paramètre répété garde sa première valeur, un absent disparaît", () => {
  assert.deepEqual(catalogQueryForPage({ q: ["a", "b"], sort: undefined }, 2), {
    q: "a",
    page: "2",
  });
});

test("sans paramètre, l'adresse est le chemin nu, sans « ? » final", () => {
  assert.equal(catalogHref({}), "/catalogue");
  assert.deepEqual(catalogHref({ page: "2" }), {
    pathname: "/catalogue",
    query: { page: "2" },
  });
});

test("une URL vide donne le catalogue par défaut, page 1", () => {
  assert.deepEqual(parseCatalogParams({}, { voicings: [], languages: [] }), {
    q: "",
    sort: "featured",
    page: 1,
    periods: [],
    voicings: [],
    languages: [],
  });
});
