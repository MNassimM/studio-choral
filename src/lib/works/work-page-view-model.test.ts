import { test } from "node:test";
import assert from "node:assert/strict";

import { absorbs } from "@/lib/access/grants";
import { resolveWorkAccess } from "@/lib/access/rules";
import { productToGrant } from "@/lib/catalog/product-grant";
import {
  buildWorkPageViewModel,
  type ViewModelMovement,
  type ViewModelProduct,
} from "@/lib/works/work-page-view-model";
import type { Grant, WorkAccessInput } from "@/types/domain";

console.log(
  "▶ src/lib/works/work-page-view-model.ts — les vues de la page œuvre : accès, téléchargements, offres",
);

/**
 * Les vues de la page oeuvre, construites sans base ni traduction réelle.
 */

const WORK_ID = "w1";
const VOICES = [
  { id: "vs", code: "SOPRANO" },
  { id: "va", code: "ALTO" },
];

/** Les pistes d'un mouvement, complètes pour les deux pupitres. */
function tracks(): ViewModelMovement["audioFiles"] {
  const parVoix = VOICES.flatMap((voice) =>
    (["SOLO", "PREDOMINANT", "PREVIEW"] as const).map((type) => ({
      id: `audio-${voice.id}-${type}`,
      type,
      voiceId: voice.id,
      mimeType: "audio/wav",
      sizeBytes: 2048,
    })),
  );
  return [
    ...parVoix,
    {
      id: "audio-tutti",
      type: "TUTTI",
      voiceId: null,
      mimeType: "audio/wav",
      sizeBytes: 4096,
    },
    {
      id: "audio-accompaniment",
      type: "ACCOMPANIMENT",
      voiceId: null,
      mimeType: "audio/wav",
      sizeBytes: 4096,
    },
  ];
}

/** Une offre du catalogue, réduite à ce que le view model regarde. */
function offer(
  sku: string,
  scope: "MOVEMENT" | "WORK",
  coverage: "SINGLE_VOICE" | "ALL_VOICES",
  movementId: string | null,
  voiceCode: string | null,
  priceCents: number,
  movementTitle: string | null,
): ViewModelProduct {
  return {
    sku,
    scope,
    coverage,
    movementId,
    priceCents,
    currency: "EUR",
    voice: voiceCode ? { code: voiceCode } : null,
    movement: movementTitle ? { title: movementTitle } : null,
  };
}

/** Une oeuvre de test : deux mouvements, deux pupitres, offres complètes. */
function makeWork(movementCount: 1 | 2) {
  const ids = movementCount === 1 ? ["m1"] : ["m1", "m2"];
  const titres: Record<string, string> = { m1: "Kyrie", m2: "Gloria" };

  const layout: WorkAccessInput = {
    id: WORK_ID,
    movements: ids.map((id) => ({
      id,
      voiceCodes: VOICES.map((voice) => voice.code),
    })),
  };

  const movements: ViewModelMovement[] = ids.map((id) => ({
    id,
    title: titres[id],
    audioFiles: tracks(),
  }));

  const products: ViewModelProduct[] = [
    ...ids.flatMap((id) => [
      ...VOICES.map((voice) =>
        offer(
          `${id}-${voice.code}`,
          "MOVEMENT",
          "SINGLE_VOICE",
          id,
          voice.code,
          200,
          titres[id],
        ),
      ),
      offer(`${id}-all`, "MOVEMENT", "ALL_VOICES", id, null, 400, titres[id]),
    ]),
    ...VOICES.map((voice) =>
      offer(
        `work-${voice.code}`,
        "WORK",
        "SINGLE_VOICE",
        null,
        voice.code,
        400,
        null,
      ),
    ),
    offer("work-all", "WORK", "ALL_VOICES", null, null, 800, null),
  ];

  return { layout, movements, products };
}

/** Monte le view model pour des droits donnés. */
function viewsFor(grants: Grant[], movementCount: 1 | 2 = 2) {
  const { layout, movements, products } = makeWork(movementCount);
  const access = resolveWorkAccess(layout, grants);

  return {
    access,
    model: buildWorkPageViewModel({
      access,
      layout,
      voices: VOICES,
      movements,
      products,
      workId: WORK_ID,
      workTitle: "Messe",
      // Fonctions de mise en forme factices : le view model les reçoit par
      // injection, il n'a donc aucune dépendance à next-intl.
      getVoiceLabel: (code) => `label:${code}`,
      getPriceLabel: (cents) => `${(cents / 100).toFixed(2)} EUR`,
      composeProductName: (voiceLabel, targetTitle) =>
        `${voiceLabel ?? "toutes"} / ${targetTitle}`,
      isAlreadyOwned: (product) =>
        grants.some((grant) =>
          absorbs(grant, productToGrant(WORK_ID, product)),
        ),
    }),
  };
}

/** Le droit d'un pupitre sur l'oeuvre entière. */
function voiceGrant(voiceCode: string): Grant {
  return {
    workId: WORK_ID,
    movementId: null,
    voiceCode,
    scope: "WORK",
    coverage: "SINGLE_VOICE",
  };
}

test("un visiteur sans droit ne possède rien, aucun téléchargement", () => {
  const { access, model } = viewsFor([]);

  assert.equal(access.ownsAnything, false);
  assert.deepEqual(model.ownedVoiceViews, []);
  assert.equal(
    model.downloadGroups.every((groupe) =>
      groupe.entries.every((entree) => entree.owned === false),
    ),
    true,
  );
  assert.equal(model.hasTuttiDownload, false);
  assert.equal(model.hasAccompanimentDownload, false);
});

test("la grille range les pupitres dans l'ordre de la table, puis tutti et accompagnement", () => {
  const { layout, movements, products } = makeWork(1);
  // Pistes rendues dans le désordre, comme la base peut le faire sans ORDER
  // BY : l'alto arrive avant le soprano, l'accompagnement avant le tutti.
  const desordre = movements.map((movement) => ({
    ...movement,
    audioFiles: [...movement.audioFiles].reverse(),
  }));
  const access = resolveWorkAccess(layout, []);
  const model = buildWorkPageViewModel({
    access,
    layout,
    voices: VOICES,
    movements: desordre,
    products,
    workId: WORK_ID,
    workTitle: "Messe",
    getVoiceLabel: (code) => code,
    getPriceLabel: () => "",
    composeProductName: () => "",
    isAlreadyOwned: () => false,
  });

  assert.deepEqual(
    model.downloadGroups[0].entries.map(
      (entree) => entree.voiceLabel ?? entree.audioType,
    ),
    ["SOPRANO", "ALTO", "TUTTI", "ACCOMPANIMENT"],
  );
});

test("la grille de téléchargement écarte les extraits et les voix seules", () => {
  const { model } = viewsFor([voiceGrant("ALTO")]);
  const types = model.downloadGroups[0].entries.map(
    (entree) => entree.audioType,
  );

  assert.equal(types.includes("PREVIEW" as never), false);
  assert.equal(types.includes("SOLO" as never), false);
  assert.deepEqual(types.sort(), [
    "ACCOMPANIMENT",
    "PREDOMINANT",
    "PREDOMINANT",
    "TUTTI",
  ]);
});

test("posséder un pupitre sur l'oeuvre entière ne rend PAS ownsFullWork vrai", () => {
  // Le piège documenté : l'alto est débloqué partout, mais il reste un seul
  // pupitre sur deux, l'oeuvre n'est pas possédée.
  const { access, model } = viewsFor([voiceGrant("ALTO")]);

  assert.equal(access.ownsAnything, true);
  assert.equal(access.ownsFullWork, false);
  assert.deepEqual(
    model.ownedVoiceViews.map((vue) => vue.code),
    ["ALTO"],
  );
  assert.equal(
    model.movementOfferGroups.every((groupe) => groupe.fullyOwned === false),
    true,
  );
});

test("posséder toutes les voix rend ownsFullWork vrai et les mouvements complets", () => {
  const { access, model } = viewsFor([
    voiceGrant("SOPRANO"),
    voiceGrant("ALTO"),
  ]);

  assert.equal(access.ownsFullWork, true);
  assert.deepEqual(
    model.ownedVoiceViews.map((vue) => vue.code),
    ["SOPRANO", "ALTO"],
  );
  assert.equal(
    model.movementOfferGroups.every((groupe) => groupe.fullyOwned),
    true,
  );
});

test("cumuler tous les pupitres ouvre le téléchargement du tutti", () => {
  // Les deux chemins vers l'oeuvre entière coûtent le même prix, ils doivent
  // donc ouvrir les mêmes droits. L'offre toutes voix n'est qu'un achat
  // unique, pas un achat privilégié.
  const cumul = viewsFor([voiceGrant("SOPRANO"), voiceGrant("ALTO")]);
  assert.equal(cumul.access.ownsFullWork, true);
  assert.equal(cumul.model.hasTuttiDownload, true);

  const packComplet = viewsFor([
    {
      workId: WORK_ID,
      movementId: null,
      voiceCode: null,
      scope: "WORK",
      coverage: "ALL_VOICES",
    },
  ]);
  assert.equal(packComplet.access.ownsFullWork, true);
  assert.equal(packComplet.model.hasTuttiDownload, true);
});

test("les pupitres possédés sortent dans l'ordre de la table, pas des droits", () => {
  // Les droits arrivent alto puis soprano, l'affichage doit rendre l'ordre
  // canonique de la table Voice.
  const { model } = viewsFor([voiceGrant("ALTO"), voiceGrant("SOPRANO")]);

  assert.deepEqual(
    model.ownedVoiceViews.map((vue) => vue.code),
    ["SOPRANO", "ALTO"],
  );
});

test("une offre déjà possédée est marquée alreadyOwned", () => {
  const { model } = viewsFor([voiceGrant("ALTO")]);

  const parSku = new Map(
    model.movementOfferGroups
      .flatMap((groupe) => groupe.offers)
      .concat(model.workSingleVoiceCards)
      .map((offre) => [offre.sku, offre.alreadyOwned]),
  );

  // Le droit porte sur l'oeuvre entière : il absorbe l'offre par mouvement.
  assert.equal(parSku.get("work-ALTO"), true);
  assert.equal(parSku.get("m1-ALTO"), true);
  assert.equal(parSku.get("m2-ALTO"), true);
  // Le soprano n'est pas possédé.
  assert.equal(parSku.get("work-SOPRANO"), false);
  assert.equal(parSku.get("m1-SOPRANO"), false);
});

test("le pack toutes voix est remisé au prorata de ce qui est déjà possédé", () => {
  // Deux mouvements fois deux pupitres, soit quatre cellules. L'alto en couvre
  // deux, donc la moitié : 800 centimes tombent à 400.
  const { model } = viewsFor([voiceGrant("ALTO")]);

  assert.equal(model.workAllVoicesCard?.discount?.percentOff, 50);
  assert.equal(
    model.workAllVoicesCard?.discount?.originalPriceLabel,
    "8.00 EUR",
  );
  assert.equal(
    model.workAllVoicesCard?.discount?.discountedPriceLabel,
    "4.00 EUR",
  );
});

test("sans aucun droit, le pack toutes voix n'affiche aucune remise", () => {
  const { model } = viewsFor([]);

  assert.equal(model.workAllVoicesCard?.discount, null);
});

test("le pack toutes voix annonce le nombre de pupitres qu'il couvre", () => {
  const { model } = viewsFor([]);

  // Et rien d'autre : il coûte ses pupitres réunis et ouvre leurs droits,
  // il n'a aucun avantage propre à mettre en avant.
  assert.equal(model.workAllVoicesCard?.allVoices?.voiceCount, 2);
});

test("les noms d'offre passent par la fonction de composition injectée", () => {
  const { model } = viewsFor([]);

  assert.equal(model.workAllVoicesCard?.name, "toutes / Messe");
  assert.equal(
    model.movementOfferGroups[0].offers[0].name,
    "label:SOPRANO / Kyrie",
  );
});

test("l'onglet ouvert par défaut évite un mouvement déjà entièrement possédé", () => {
  const { model } = viewsFor([voiceGrant("SOPRANO"), voiceGrant("ALTO")]);

  // Tous les mouvements sont possédés : on retombe sur le premier.
  assert.equal(model.defaultOfferMovementId, "m1");
  // Et côté téléchargements, on ouvre sur un mouvement débloqué.
  assert.equal(model.defaultDownloadMovementId, "m1");
});

test("une oeuvre à mouvement unique est signalée comme telle", () => {
  const { model } = viewsFor([voiceGrant("ALTO")], 1);

  assert.equal(model.hasSingleMovement, true);
  assert.equal(model.movementOfferGroups.length, 1);
  assert.equal(model.downloadGroups.length, 1);
  // Une seule cellule possédée sur deux : la remise tombe à la moitié.
  assert.equal(model.workAllVoicesCard?.discount?.percentOff, 50);
});

test("une oeuvre sans offre toutes voix ne rend aucune carte de pack", () => {
  const { layout, movements, products } = makeWork(2);
  const access = resolveWorkAccess(layout, []);

  const model = buildWorkPageViewModel({
    access,
    layout,
    voices: VOICES,
    movements,
    products: products.filter((product) => product.sku !== "work-all"),
    workId: WORK_ID,
    workTitle: "Messe",
    getVoiceLabel: (code) => code,
    getPriceLabel: (cents) => String(cents),
    composeProductName: (voiceLabel, targetTitle) =>
      `${voiceLabel ?? "toutes"} / ${targetTitle}`,
    isAlreadyOwned: () => false,
  });

  assert.equal(model.workAllVoicesCard, null);
  assert.equal(model.workSingleVoiceCards.length, 2);
});
