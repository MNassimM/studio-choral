import { test } from "node:test";
import assert from "node:assert/strict";

import { validateCover } from "@/lib/admin/images/cover-upload";
import { MAX_COVER_BYTES } from "@/lib/storage/keys";

console.log(
  "▶ src/lib/admin/images/cover-upload.ts — validation d'un dépôt de couverture",
);

/** Un dépôt valide, que chaque test altère sur un seul point. */
function candidat(
  overrides: Partial<Parameters<typeof validateCover>[0]> = {},
) {
  return {
    filename: "pochette.jpg",
    contentType: "image/jpeg",
    sizeBytes: 250_000,
    ...overrides,
  };
}

test("un dépôt conforme est accepté et rend son extension", () => {
  const verdict = validateCover(candidat());
  assert.equal(verdict.ok, true);
  assert.equal(verdict.ok && verdict.extension, "jpg");
});

test("une extension non gérée est refusée", () => {
  const verdict = validateCover(
    candidat({ filename: "pochette.gif", contentType: "image/gif" }),
  );
  assert.equal(verdict.ok, false);
});

test("un type MIME qui ne correspond pas à l'extension est refusé", () => {
  // Le cas qui compte : un fichier renommé pour passer pour une image.
  const verdict = validateCover(
    candidat({ filename: "pochette.png", contentType: "image/jpeg" }),
  );
  assert.equal(verdict.ok, false);
});

test("jpg et jpeg partagent le même type MIME", () => {
  assert.equal(validateCover(candidat({ filename: "a.jpeg" })).ok, true);
});

test("une image trop lourde est refusée, la limite exacte passe", () => {
  assert.equal(
    validateCover(candidat({ sizeBytes: MAX_COVER_BYTES + 1 })).ok,
    false,
  );
  assert.equal(
    validateCover(candidat({ sizeBytes: MAX_COVER_BYTES })).ok,
    true,
  );
});

test("une taille absurde est refusée", () => {
  assert.equal(validateCover(candidat({ sizeBytes: 0 })).ok, false);
  assert.equal(validateCover(candidat({ sizeBytes: -1 })).ok, false);
  assert.equal(validateCover(candidat({ sizeBytes: 1.5 })).ok, false);
});

test("une piste audio ne passe pas pour une couverture", () => {
  const verdict = validateCover(
    candidat({ filename: "kyrie.wav", contentType: "audio/wav" }),
  );
  assert.equal(verdict.ok, false);
});
