import type { Prisma } from "@/generated/prisma/client";
import { toCents, type WorkFormValues } from "@/lib/admin/work-form-schema";

/**
 * Construction des mouvements et des offres d'une oeuvre.
 */

/** Transforme un titre en slug d'URL, sans accent ni ponctuation. */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rend des slugs uniques au sein d'une même oeuvre. */
export function uniqueSlugs(titles: string[]): string[] {
  const vus = new Map<string, number>();
  return titles.map((title, index) => {
    const base = slugify(title) || `mouvement-${index + 1}`;
    const dejaVu = vus.get(base) ?? 0;
    vus.set(base, dejaVu + 1);
    return dejaVu === 0 ? base : `${base}-${dejaVu + 1}`;
  });
}

/**
 * Construit la référence d'un produit, au format déjà présent en base.
 */
export function buildSku(
  workSlug: string,
  movementSlug: string | null,
  voiceCode: string | null,
): string {
  const parts = [workSlug];
  if (movementSlug !== null) parts.push(movementSlug);
  parts.push(voiceCode === null ? "all" : voiceCode.toLowerCase());
  return parts.join(":");
}

/**
 * Dit si une oeuvre se vend aussi au mouvement.
 */
export function sellsPerMovement(movementCount: number): boolean {
  return movementCount > 1;
}

/** Un mouvement déjà enregistré, tel qu'il sert à nommer les offres. */
export type MovementRow = { id: string; slug: string; title: string };

/** Un pupitre retrouvé en base. */
export type VoiceRow = { id: string; code: string; label: string };

/** Clé d'identité d'un produit, ses coordonnées et non sa référence. */
export function productKey(
  movementId: string | null,
  voiceId: string | null,
  coverage: string,
): string {
  return `${movementId ?? ""}|${voiceId ?? ""}|${coverage}`;
}

/**
 * Fabrique la liste complète des offres d'une oeuvre.
 *
 * @param workSlug - Slug de l'oeuvre, racine de toutes les références.
 * @param workTitle - Titre de l'oeuvre, repris dans le nom des offres.
 * @param movements - Mouvements déjà enregistrés, dans l'ordre.
 * @param voices - Pupitres de l'oeuvre, dans l'ordre saisi.
 * @param prices - Les quatre prix catalogue, en euros.
 * @returns Les lignes de produits à écrire.
 */
export function buildProductRows(
  workSlug: string,
  workTitle: string,
  movements: MovementRow[],
  voices: VoiceRow[],
  prices: WorkFormValues["prices"],
): Prisma.ProductCreateManyWorkInput[] {
  const rows: Prisma.ProductCreateManyWorkInput[] = [];
  let position = 1;

  // Sans prix d'oeuvre, aucune offre n'est vendable : un brouillon peut très
  // bien n'en avoir aucune, publishWork refusera de le publier.
  if (prices.workSingleVoice === null || prices.workAllVoices === null) {
    return rows;
  }

  if (
    sellsPerMovement(movements.length) &&
    prices.movementSingleVoice !== null &&
    prices.movementAllVoices !== null
  ) {
    for (const movement of movements) {
      for (const voice of voices) {
        rows.push({
          sku: buildSku(workSlug, movement.slug, voice.code),
          name: `${voice.label} - ${movement.title}`,
          scope: "MOVEMENT",
          coverage: "SINGLE_VOICE",
          movementId: movement.id,
          voiceId: voice.id,
          priceCents: toCents(prices.movementSingleVoice),
          currency: "EUR",
          isActive: true,
          position: position++,
        });
      }

      rows.push({
        sku: buildSku(workSlug, movement.slug, null),
        name: `Toutes les voix - ${movement.title}`,
        scope: "MOVEMENT",
        coverage: "ALL_VOICES",
        movementId: movement.id,
        voiceId: null,
        priceCents: toCents(prices.movementAllVoices),
        currency: "EUR",
        isActive: true,
        position: position++,
      });
    }
  }

  for (const voice of voices) {
    rows.push({
      sku: buildSku(workSlug, null, voice.code),
      name: `${voice.label} - ${workTitle}`,
      scope: "WORK",
      coverage: "SINGLE_VOICE",
      movementId: null,
      voiceId: voice.id,
      priceCents: toCents(prices.workSingleVoice),
      currency: "EUR",
      isActive: true,
      position: position++,
    });
  }

  rows.push({
    sku: buildSku(workSlug, null, null),
    name: `Toutes les voix - ${workTitle}`,
    scope: "WORK",
    coverage: "ALL_VOICES",
    movementId: null,
    voiceId: null,
    priceCents: toCents(prices.workAllVoices),
    currency: "EUR",
    isActive: true,
    position: position++,
  });

  return rows;
}
