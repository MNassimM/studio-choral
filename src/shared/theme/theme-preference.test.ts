import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_THEME,
  parseThemePreference,
  themeClass,
  themeColorScheme,
} from "@/shared/theme/theme-preference";

console.log(
  "▶ src/shared/theme/theme-preference.ts — thème choisi, sa lecture depuis le cookie et sa traduction en classe",
);

test("les trois thèmes proposés sont reconnus", () => {
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(parseThemePreference("dark"), "dark");
  assert.equal(parseThemePreference("system"), "system");
});

test("toute autre valeur est refusée, sans erreur", () => {
  for (const valeur of ["", "Dark", "auto", "sombre", undefined, null]) {
    assert.equal(parseThemePreference(valeur), null, `${String(valeur)}`);
  }
  // Un cookie répété ne doit pas passer par surprise.
  assert.equal(parseThemePreference(["light", "dark"]), "light");
});

test("sans choix, le site reste sombre comme avant", () => {
  assert.equal(DEFAULT_THEME, "dark");
  assert.equal(themeClass(DEFAULT_THEME), "dark");
});

test("seul le thème sombre pose une classe", () => {
  assert.equal(themeClass("dark"), "dark");
  assert.equal(themeClass("light"), "");
  // En « system », c'est le script client qui tranchera.
  assert.equal(themeClass("system"), "");
});

test("color-scheme suit le choix, sauf en « system »", () => {
  assert.equal(themeColorScheme("light"), "light");
  assert.equal(themeColorScheme("dark"), "dark");
  assert.equal(themeColorScheme("system"), undefined);
});
