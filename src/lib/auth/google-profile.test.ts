import { test } from "node:test";
import assert from "node:assert/strict";

import { mapGoogleProfile } from "@/lib/auth/google-profile";

test("une adresse déjà en minuscules est laissée telle quelle", () => {
  const user = mapGoogleProfile({
    sub: "1234567890",
    name: "Jean Dupont",
    email: "jean@gmail.com",
    picture: "https://exemple.test/photo.jpg",
  });

  assert.equal(user.email, "jean@gmail.com");
  assert.equal(user.id, "1234567890");
  assert.equal(user.name, "Jean Dupont");
});

test("une adresse comportant des majuscules est ramenée en minuscules", () => {
  // C'est le cas qui, sans normalisation, créerait un second compte : Auth.js
  // cherche par égalité stricte et ne retrouverait pas jean@gmail.com.
  const user = mapGoogleProfile({
    sub: "1234567890",
    email: "Jean@Gmail.COM",
  });

  assert.equal(user.email, "jean@gmail.com");
});

test("les espaces en bordure d'adresse sont retirés", () => {
  const user = mapGoogleProfile({ sub: "1", email: "  jean@gmail.com  " });

  assert.equal(user.email, "jean@gmail.com");
});

test("un nom ou une photo absents deviennent nuls plutôt qu'indéfinis", () => {
  // La colonne accepte NULL, pas une valeur absente, et l'adaptateur Prisma
  // écrit ce qu'on lui donne.
  const user = mapGoogleProfile({ sub: "1", email: "jean@gmail.com" });

  assert.equal(user.name, null);
  assert.equal(user.image, null);
});

test("le sous adressage est conservé", () => {
  // jean+choral@gmail.com est une adresse distincte que l'utilisateur a
  // choisie, la dépouiller fusionnerait des comptes qu'il veut séparés. Même
  // règle que la normalisation du lien magique.
  const user = mapGoogleProfile({ sub: "1", email: "Jean+Choral@Gmail.com" });

  assert.equal(user.email, "jean+choral@gmail.com");
});
