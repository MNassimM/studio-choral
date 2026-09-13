import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isSafeRedirectTarget,
  safeRedirectTarget,
} from "@/features/auth/server/redirect-target";

console.log(
  "▶ src/features/auth/server/redirect-target.ts — sûreté d'une cible de redirection après connexion",
);

test("un chemin interne simple est accepté", () => {
  assert.equal(isSafeRedirectTarget("/compte"), true);
  assert.equal(isSafeRedirectTarget("/en/account"), true);
  assert.equal(safeRedirectTarget("/bibliotheque"), "/bibliotheque");
});

test("un chemin interne avec query et fragment est accepté", () => {
  assert.equal(
    isSafeRedirectTarget("/catalogue?view=list&sort=title-asc"),
    true,
  );
  assert.equal(
    isSafeRedirectTarget("/oeuvres/messe-en-sol-majeur#offres"),
    true,
  );
});

test("une URL absolue vers un domaine externe est refusée", () => {
  assert.equal(isSafeRedirectTarget("https://exemple-malveillant.test"), false);
  assert.equal(
    isSafeRedirectTarget("http://exemple-malveillant.test/x"),
    false,
  );
  assert.equal(safeRedirectTarget("https://exemple-malveillant.test"), "/");
});

test("une URL sans protocole est refusée", () => {
  assert.equal(isSafeRedirectTarget("//exemple-malveillant.test"), false);
  assert.equal(safeRedirectTarget("//exemple-malveillant.test/x"), "/");
});

test("une barre oblique suivie d'un antislash est refusée", () => {
  assert.equal(isSafeRedirectTarget("/\\exemple-malveillant.test"), false);
  assert.equal(safeRedirectTarget("/\\exemple-malveillant.test"), "/");
});

test("une valeur absente ou vide retombe sur la racine", () => {
  assert.equal(isSafeRedirectTarget(undefined), false);
  assert.equal(isSafeRedirectTarget(null), false);
  assert.equal(isSafeRedirectTarget(""), false);
  assert.equal(safeRedirectTarget(undefined), "/");
});

test("une valeur qui ne commence pas par une barre oblique est refusée", () => {
  assert.equal(isSafeRedirectTarget("compte"), false);
  assert.equal(isSafeRedirectTarget("javascript:alert(1)"), false);
  assert.equal(safeRedirectTarget("compte"), "/");
});
