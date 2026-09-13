import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  PeriodValue,
  SortValue,
} from "@/features/catalog/domain/catalog-options";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  CATALOG_PAGE_SIZE,
  pageCount,
} from "@/features/catalog/domain/pagination";
import {
  buildWorkCardInclude,
  deriveWorkCardData,
  type WorkCardData,
} from "@/features/catalog/server/work-card-view-model";
import { prisma } from "@/server/db/prisma";

/**
 * Sélection, tri et découpage du catalogue.
 *
 * @remarks
 * Une requête SQL décide quelles œuvres paraissent et dans quel ordre, puis
 * Prisma charge ces seules œuvres avec l'include des cartes. Le SQL n'est pas
 * un choix de confort : deux clés de tri, le titre traduit et le prix « à
 * partir de », ne s'expriment pas en orderBy Prisma. Le premier est un repli
 * entre une relation et une colonne, le second un minimum sur une relation.
 *
 * Toute valeur venue de l'URL passe en paramètre. Les seuls fragments insérés
 * tels quels, le ORDER BY et la collation, sortent de listes fermées.
 */

/** Ce que le catalogue demande. */
export type CatalogQuery = {
  locale: AppLocale;
  q: string;
  sort: SortValue;
  periods: PeriodValue[];
  voicings: string[];
  languages: string[];
  page: number;
  /** Injectable pour éprouver la pagination sur peu d'œuvres. */
  pageSize?: number;
};

/**
 * Ce que rend le catalogue.
 *
 * @remarks
 * Une page au delà de la dernière n'est pas rendue vide : l'appelant reçoit la
 * dernière page valide et redirige, plutôt que de servir une page vide en 200.
 */
export type CatalogPage =
  | {
      kind: "page";
      works: WorkCardData[];
      total: number;
      page: number;
      pageCount: number;
      pageSize: number;
    }
  | { kind: "outOfRange"; lastPage: number };

/**
 * Collation ICU de chaque locale.
 *
 * @remarks
 * La collation de la base, en_US.utf8 fournie par la libc, classait
 * « Byrd < Zelenka < abélard < Éccard ». Les collations ICU donnent l'ordre de
 * localeCompare, que le tri en mémoire appliquait, vérifié identique sur
 * accents, casse, « Œ » et « Ç » dans les deux langues.
 */
const COLLATION: Record<AppLocale, Prisma.Sql> = {
  fr: Prisma.raw('"fr-x-icu"'),
  en: Prisma.raw('"en-x-icu"'),
};

/**
 * Échappe les jokers de LIKE.
 *
 * @param value - Texte recherché.
 * @returns Le texte où « % », « _ » et « \ » se cherchent eux-mêmes.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

/**
 * Choisit l'ordre d'un tri.
 *
 * @remarks
 * Chaque tri finit par created_at puis id. created_at reproduit l'ancien
 * départage : le tri en mémoire était stable et partait d'une liste rangée par
 * date de création, deux œuvres au même prix gardaient donc cet ordre-là. id
 * rend l'ordre total, sans quoi deux requêtes pourraient ranger différemment
 * des égalités, et une œuvre paraître sur deux pages ou sur aucune.
 *
 * Les œuvres sans offre vendable finissent en dernier dans les deux sens du
 * prix, comme l'ancien tri qui les comptait à +∞ puis à -∞.
 *
 * @param sort - Tri validé.
 * @param collation - Collation de la locale.
 * @returns Le fragment ORDER BY.
 */
function orderByFor(sort: SortValue, collation: Prisma.Sql): Prisma.Sql {
  const departage = Prisma.sql`created_at ASC, id ASC`;
  switch (sort) {
    case "price-asc":
      return Prisma.sql`from_price ASC NULLS LAST, ${departage}`;
    case "price-desc":
      return Prisma.sql`from_price DESC NULLS LAST, ${departage}`;
    case "title-asc":
      return Prisma.sql`title COLLATE ${collation} ASC, ${departage}`;
    case "composer-asc":
      return Prisma.sql`composer COLLATE ${collation} ASC, ${departage}`;
    case "featured":
      return departage;
  }
}

/**
 * Renvoie une page du catalogue.
 *
 * @param query - Recherche, filtres, tri et page, déjà validés.
 * @returns Les œuvres de la page dans l'ordre du tri, ou la dernière page
 * valide si celle demandée n'existe pas.
 */
export async function findCatalogPage(
  query: CatalogQuery,
): Promise<CatalogPage> {
  const { locale, q, sort, periods, voicings, languages } = query;
  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE;

  // Reproduit resolveWorkTranslation champ par champ : dans la langue par
  // défaut aucune traduction n'est lue, ailleurs chaque champ traduit nul
  // retombe sur le champ d'origine. L'unique (work_id, locale) garantit au
  // plus une ligne jointe, donc aucune œuvre comptée deux fois.
  const traduite = locale !== routing.defaultLocale;
  const jointure = traduite
    ? Prisma.sql`LEFT JOIN work_translations t ON t.work_id = w.id AND t.locale = ${locale}`
    : Prisma.empty;
  const titre = traduite
    ? Prisma.sql`COALESCE(t.title, w.title)`
    : Prisma.sql`w.title`;
  const accroche = traduite
    ? Prisma.sql`COALESCE(t.short_description, w.short_description)`
    : Prisma.sql`w.short_description`;

  const conditions: Prisma.Sql[] = [Prisma.sql`w.is_published`];
  if (q) {
    // Titre et accroche dans la langue affichée, comme le filtre en mémoire :
    // un anglophone qui tape « mass » doit trouver la messe.
    const motif = `%${escapeLikePattern(q)}%`;
    conditions.push(
      Prisma.sql`(${titre} ILIKE ${motif} ESCAPE '\\'
        OR w.composer ILIKE ${motif} ESCAPE '\\'
        OR ${accroche} ILIKE ${motif} ESCAPE '\\')`,
    );
  }
  // OU à l'intérieur d'une catégorie, ET entre catégories. IN écarte les
  // œuvres dont la valeur est nulle, comme le filtre en mémoire.
  if (periods.length > 0) {
    conditions.push(Prisma.sql`w.period::text IN (${Prisma.join(periods)})`);
  }
  if (voicings.length > 0) {
    conditions.push(Prisma.sql`w.voicing IN (${Prisma.join(voicings)})`);
  }
  if (languages.length > 0) {
    conditions.push(Prisma.sql`w.language IN (${Prisma.join(languages)})`);
  }
  const where = Prisma.join(conditions, " AND ");

  const [{ total }] = await prisma.$queryRaw<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM works w ${jointure}
    WHERE ${where}
  `;

  const count = pageCount(total, pageSize);
  if (query.page > count) {
    return { kind: "outOfRange", lastPage: count };
  }

  // Même règle que SELLABLE_PRODUCT_WHERE, qui alimente le prix affiché sur
  // les cartes : une œuvre ne doit jamais être classée sur un autre prix que
  // celui qu'elle annonce.
  const lignes = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT
        w.id,
        w.created_at,
        ${titre} AS title,
        w.composer,
        (
          SELECT MIN(p.price_cents)
          FROM products p
          WHERE p.work_id = w.id AND p.is_active AND NOT p.is_retired
        ) AS from_price
      FROM works w ${jointure}
      WHERE ${where}
    ) catalogue
    ORDER BY ${orderByFor(sort, COLLATION[locale])}
    LIMIT ${pageSize} OFFSET ${(query.page - 1) * pageSize}
  `;

  const ids = lignes.map((ligne) => ligne.id);
  const chargees =
    ids.length > 0
      ? await prisma.work.findMany({
          where: { id: { in: ids } },
          include: buildWorkCardInclude(locale),
        })
      : [];

  // findMany ne garantit aucun ordre : on remet celui du tri SQL.
  const parId = new Map(chargees.map((work) => [work.id, work]));
  const works = ids.flatMap((id) => {
    const work = parId.get(id);
    return work ? [deriveWorkCardData(work, locale)] : [];
  });

  return {
    kind: "page",
    works,
    total,
    page: query.page,
    pageCount: count,
    pageSize,
  };
}
