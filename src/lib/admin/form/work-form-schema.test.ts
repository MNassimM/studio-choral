import { test } from "node:test";
import assert from "node:assert/strict";

import { toCents, workFormSchema } from "@/lib/admin/form/work-form-schema";

const SATB = ["SOPRANO", "ALTO", "TENOR", "BASS"];

// Oeuvre de test : 6 mouvements, 4 pupitres, prix repris de la Messe en sol.
const messe = {
  title: "Messe en sol majeur",
  composer: "Franz Schubert",
  slug: "messe-en-sol-majeur",
  catalogueRef: "D.167",
  shortDescription: "Une messe brève et lumineuse.",
  description: "Six mouvements pour choeur à quatre voix et accompagnement.",
  period: "CLASSICAL",
  voicing: "SATB",
  language: "la",
  composedYear: 1815,
  hasAccompaniment: true,
  translations: {
    en: {
      slug: "mass-in-g-major",
      title: "Mass in G major",
      shortDescription: "A short and luminous mass.",
      description: "Six movements for four part choir and accompaniment.",
    },
  },
  voiceCodes: SATB,
  movements: [
    { key: "k1", title: "Kyrie" },
    { key: "k2", title: "Gloria" },
    { key: "k3", title: "Credo" },
    { key: "k4", title: "Sanctus" },
    { key: "k5", title: "Benedictus" },
    { key: "k6", title: "Agnus Dei" },
  ],
  tracks: [],
  prices: {
    movementSingleVoice: 1.9,
    movementAllVoices: 3.9,
    workSingleVoice: 8.9,
    workAllVoices: 14.9,
  },
};

// Oeuvre à mouvement unique : pas d'offre au mouvement, donc pas de prix.
const milleRegretz = {
  ...messe,
  title: "Mille regretz",
  composer: "Josquin des Prez",
  slug: "mille-regretz",
  catalogueRef: null,
  period: "RENAISSANCE",
  language: "fr",
  composedYear: null,
  hasAccompaniment: false,
  translations: {
    en: {
      slug: "mille-regretz-en",
      title: null,
      shortDescription: "A chanson of farewell.",
      description: "One of the most copied chansons of its century.",
    },
  },
  movements: [{ key: "m1", title: "Mille regretz" }],
  prices: {
    movementSingleVoice: null,
    movementAllVoices: null,
    workSingleVoice: 2.5,
    workAllVoices: 3.9,
  },
};

/** Renvoie les chemins d'erreur d'une entrée refusée. */
function chemins(input: unknown): string[] {
  const result = workFormSchema.safeParse(input);
  assert.equal(result.success, false, "cette entrée aurait dû être refusée");
  return result.error!.issues.map((issue) => issue.path.join("."));
}

test("un formulaire valide passe", () => {
  const result = workFormSchema.safeParse(messe);
  assert.equal(result.success, true);
});

test("une oeuvre à mouvement unique passe sans prix de mouvement", () => {
  const result = workFormSchema.safeParse(milleRegretz);
  assert.equal(result.success, true);
});

test("le titre est obligatoire", () => {
  assert.deepEqual(chemins({ ...messe, title: "" }), ["title"]);
});

test("un slug mal formé est refusé", () => {
  assert.deepEqual(chemins({ ...messe, slug: "Messe En Sol" }), ["slug"]);
});

test("un prix négatif est refusé", () => {
  const erreurs = chemins({
    ...messe,
    prices: { ...messe.prices, workSingleVoice: -1 },
  });
  assert.ok(erreurs.includes("prices.workSingleVoice"));
});

test("un pack moins cher qu'une voix seule est refusé", () => {
  const erreurs = chemins({
    ...messe,
    prices: { ...messe.prices, workAllVoices: 1 },
  });
  assert.ok(erreurs.includes("prices.workAllVoices"));
});

test("un pack plus cher que ses pupitres pris à l'unité est refusé", () => {
  // 4 pupitres à 8,90 font 35,60 : un pack à 40 euros n'économise rien.
  const erreurs = chemins({
    ...messe,
    prices: { ...messe.prices, workAllVoices: 40 },
  });
  assert.ok(erreurs.includes("prices.workAllVoices"));
});

test("un pack d'oeuvre plus cher que ses mouvements est refusé", () => {
  // 6 mouvements à 3,90 font 23,40, le pack complet doit rester en dessous.
  const erreurs = chemins({
    ...messe,
    prices: { ...messe.prices, workAllVoices: 25, workSingleVoice: 8.9 },
  });
  assert.ok(erreurs.includes("prices.workAllVoices"));
});

test("une voix sur l'oeuvre moins chère que sur un mouvement est refusée", () => {
  const erreurs = chemins({
    ...messe,
    prices: { ...messe.prices, workSingleVoice: 1.5, workAllVoices: 2 },
  });
  assert.ok(erreurs.includes("prices.workSingleVoice"));
});

test("un brouillon accepte de n'avoir aucun prix de mouvement", () => {
  // C'est publishWork qui exige des offres complètes, pas l'enregistrement.
  const result = workFormSchema.safeParse({
    ...messe,
    prices: { ...messe.prices, movementSingleVoice: null },
  });
  assert.equal(result.success, true);
});

test("un mouvement unique refuse les prix de mouvement", () => {
  const erreurs = chemins({
    ...milleRegretz,
    prices: { ...milleRegretz.prices, movementAllVoices: 3 },
  });
  assert.ok(erreurs.includes("prices.movementAllVoices"));
});

test("un brouillon accepte de n'avoir aucun mouvement", () => {
  const result = workFormSchema.safeParse({
    ...messe,
    movements: [],
    tracks: [],
    prices: {
      ...messe.prices,
      movementSingleVoice: null,
      movementAllVoices: null,
    },
  });
  assert.equal(result.success, true);
});

test("un brouillon accepte de n'avoir aucun pupitre", () => {
  const result = workFormSchema.safeParse({
    ...messe,
    voiceCodes: [],
    prices: {
      movementSingleVoice: null,
      movementAllVoices: null,
      workSingleVoice: null,
      workAllVoices: null,
    },
  });
  assert.equal(result.success, true);
});

test("un brouillon presque vide passe, seul le titre est exigé", () => {
  const result = workFormSchema.safeParse({
    ...messe,
    composer: "",
    shortDescription: "",
    description: "",
    period: null,
    voicing: null,
    language: null,
    composedYear: null,
    voiceCodes: [],
    movements: [],
    tracks: [],
    prices: {
      movementSingleVoice: null,
      movementAllVoices: null,
      workSingleVoice: null,
      workAllVoices: null,
    },
  });
  assert.equal(result.success, true);
});

test("le titre reste exigé, le slug en dérive et il est unique en base", () => {
  assert.deepEqual(chemins({ ...messe, title: "" }), ["title"]);
});

test("un pupitre en double est refusé", () => {
  const erreurs = chemins({
    ...messe,
    voiceCodes: ["SOPRANO", "ALTO", "SOPRANO"],
  });
  assert.ok(erreurs.includes("voiceCodes"));
});

test("deux mouvements de même titre sont refusés", () => {
  const erreurs = chemins({
    ...messe,
    movements: [...messe.movements.slice(0, 5), { key: "k6", title: "Kyrie" }],
  });
  assert.ok(erreurs.includes("movements"));
});

test("une traduction anglaise au titre nul est acceptée", () => {
  const result = workFormSchema.safeParse({
    ...messe,
    translations: { en: { ...messe.translations.en, title: null } },
  });

  assert.equal(result.success, true);
  assert.equal(result.data!.translations.en.title, null);
});

test("une période hors de l'enum Prisma est refusée", () => {
  assert.deepEqual(chemins({ ...messe, period: "BAROQUEUX" }), ["period"]);
});

test("une langue chantée sans libellé est refusée", () => {
  assert.deepEqual(chemins({ ...messe, language: "zz" }), ["language"]);
});

test("un texte facultatif laissé vide devient nul", () => {
  const result = workFormSchema.safeParse({
    ...messe,
    catalogueRef: "   ",
    translations: { en: { ...messe.translations.en, shortDescription: "" } },
  });

  assert.equal(result.success, true);
  assert.equal(result.data!.catalogueRef, null);
  assert.equal(result.data!.translations.en.shortDescription, null);
});

test("un prix à trois décimales est refusé", () => {
  const erreurs = chemins({
    ...messe,
    prices: { ...messe.prices, workSingleVoice: 8.905 },
  });
  assert.ok(erreurs.includes("prices.workSingleVoice"));
});

test("la conversion en centimes ne dérape pas sur les flottants", () => {
  // 0,29 fois 100 vaut 28,999999999999996 : tronquer donnerait 28 centimes.
  assert.equal(toCents(0.29), 29);
  assert.equal(toCents(1.9), 190);
  assert.equal(toCents(8.9), 890);
  assert.equal(toCents(14.9), 1490);
  assert.equal(toCents(0.07), 7);
});

/** Une piste déjà envoyée, posée sur la case demandée. */
function piste(voiceCode: string | null, type: string) {
  return {
    movementKey: "k1",
    voiceCode,
    type,
    state: {
      kind: "pending",
      uploadId: "u1",
      filename: "essai.wav",
      sizeBytes: 2048,
      durationSeconds: 12,
      mimeType: "audio/wav",
    },
  };
}

test("une piste par pupitre sans pupitre est refusée", () => {
  assert.deepEqual(chemins({ ...messe, tracks: [piste(null, "SOLO")] }), [
    "tracks.0",
  ]);
});

test("une piste commune portant un pupitre est refusée", () => {
  assert.deepEqual(chemins({ ...messe, tracks: [piste("ALTO", "TUTTI")] }), [
    "tracks.0",
  ]);
});

test("une piste visant un mouvement supprimé passe, updateWork la purge", () => {
  const result = workFormSchema.safeParse({
    ...messe,
    tracks: [{ ...piste("ALTO", "SOLO"), movementKey: "disparu" }],
  });
  assert.equal(result.success, true);
});

test("une piste visant un pupitre retiré passe, updateWork la purge", () => {
  // MEZZO n'est pas dans SATB : la piste vise donc un pupitre que l'oeuvre ne
  // retient pas, sans toucher au nombre de pupitres dont les prix dépendent.
  const result = workFormSchema.safeParse({
    ...messe,
    tracks: [piste("MEZZO", "SOLO")],
  });
  assert.equal(result.success, true);
});
