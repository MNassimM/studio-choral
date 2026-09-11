import {
  PERIOD_OPTIONS,
  SORT_OPTIONS,
  type PeriodValue,
  type SortValue,
} from "@/components/catalog/catalog-options";

/**
 * Lecture et validation des paramètres d'URL du catalogue.
 *
 * @remarks
 * Fonctions pures, sans accès à la base : les formations et langues
 * réellement présentes sont fournies par l'appelant. Une valeur invalide ne
 * lève jamais d'erreur, elle est traitée comme absente.
 */

/** Paramètres d'URL tels que Next les remet à une page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Nom du paramètre de page.
 *
 * @remarks
 * Tout ce qui change l'ensemble ou l'ordre des résultats doit le retirer : la
 * page 3 d'une recherche ne désigne rien dans une autre.
 */
export const PAGE_PARAM = "page";

/** Tri appliqué quand l'URL n'en précise aucun. */
export const DEFAULT_SORT: SortValue = "featured";

/**
 * Longueur maximale retenue pour la recherche.
 *
 * @remarks
 * Au delà, le texte est tronqué : il part dans un ILIKE, rien ne justifie de
 * faire comparer à la base un motif de plusieurs kilo-octets.
 */
export const MAX_QUERY_LENGTH = 100;

/** Paramètres du catalogue une fois validés. */
export type CatalogParams = {
  q: string;
  sort: SortValue;
  page: number;
  periods: PeriodValue[];
  voicings: string[];
  languages: string[];
};

/** Valeurs de filtre réellement présentes en base, seules acceptées. */
export type AvailableFilterValues = {
  voicings: readonly string[];
  languages: readonly string[];
};

/**
 * Vérifie qu'une valeur d'URL correspond à un tri connu.
 *
 * @param value - Valeur brute lue dans l'URL.
 * @returns Vrai si le tri est supporté.
 */
export function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option === value);
}

/**
 * Vérifie qu'une valeur d'URL correspond à une période connue.
 *
 * @param value - Valeur brute lue dans l'URL.
 * @returns Vrai si la période est supportée.
 */
export function isPeriodValue(value: string): value is PeriodValue {
  return PERIOD_OPTIONS.some((option) => option === value);
}

/**
 * Lit un paramètre d'URL multivalué au format séparé par des virgules.
 *
 * @remarks
 * Chaque valeur est validée indépendamment. Une valeur inconnue est ignorée
 * sans erreur, et une URL entièrement invalide revient à aucun filtre de
 * cette catégorie.
 *
 * @param raw - Valeur brute du paramètre.
 * @param isValid - Garde de type appliquée à chaque valeur.
 * @returns Les valeurs valides, dédupliquées et dans leur ordre d'apparition.
 */
export function parseMultiValueParam<T extends string>(
  raw: unknown,
  isValid: (value: string) => value is T,
): T[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  const values: T[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(",")) {
    const trimmed = token.trim();
    if (trimmed && !seen.has(trimmed) && isValid(trimmed)) {
      seen.add(trimmed);
      values.push(trimmed);
    }
  }
  return values;
}

/**
 * Lit le texte recherché.
 *
 * @param raw - Valeur brute du paramètre q.
 * @returns Le texte sans blancs de bord, tronqué, ou une chaîne vide.
 */
export function parseQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, MAX_QUERY_LENGTH).trim();
}

/**
 * Lit le tri demandé.
 *
 * @param raw - Valeur brute du paramètre sort.
 * @returns Le tri s'il est connu, le tri par défaut sinon.
 */
export function parseSort(raw: unknown): SortValue {
  return typeof raw === "string" && isSortValue(raw) ? raw : DEFAULT_SORT;
}

/**
 * Lit le numéro de page demandé.
 *
 * @remarks
 * Ne connaît pas le nombre de pages : une page trop grande est rendue telle
 * quelle, c'est à l'appelant, qui connaît le total, de la ramener.
 *
 * @param raw - Valeur brute du paramètre page.
 * @returns Un entier supérieur ou égal à 1, 1 pour toute valeur invalide.
 */
export function parsePage(raw: unknown): number {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/**
 * Construit la query d'une page du catalogue.
 *
 * @remarks
 * Seul le paramètre de page change, tout le reste de l'URL est conservé. La
 * première page n'écrit pas page=1 : /catalogue la désigne déjà.
 *
 * @param current - Paramètres d'URL courants.
 * @param page - Page visée.
 * @returns La query à passer à un lien ou à une redirection.
 */
export function catalogQueryForPage(
  current: RawSearchParams,
  page: number,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, raw] of Object.entries(current)) {
    if (key === PAGE_PARAM) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined) query[key] = value;
  }
  if (page > 1) query[PAGE_PARAM] = String(page);
  return query;
}

/**
 * Adresse du catalogue pour une query donnée.
 *
 * @remarks
 * Sans paramètre, le chemin nu : un objet à query vide produirait
 * « /catalogue? », une URL qui ne devrait pas exister.
 *
 * @param query - Query déjà construite.
 * @returns Le chemin seul, ou le chemin et sa query.
 */
export function catalogHref(query: Record<string, string>) {
  return Object.keys(query).length > 0
    ? { pathname: "/catalogue" as const, query }
    : ("/catalogue" as const);
}

/**
 * Lit et valide tous les paramètres du catalogue.
 *
 * @param raw - Paramètres d'URL bruts.
 * @param available - Formations et langues présentes en base.
 * @returns Les paramètres validés.
 */
export function parseCatalogParams(
  raw: RawSearchParams,
  available: AvailableFilterValues,
): CatalogParams {
  return {
    q: parseQuery(raw.q),
    sort: parseSort(raw.sort),
    page: parsePage(raw[PAGE_PARAM]),
    periods: parseMultiValueParam(raw.period, isPeriodValue),
    voicings: parseMultiValueParam(raw.voicing, (value): value is string =>
      available.voicings.includes(value),
    ),
    languages: parseMultiValueParam(raw.language, (value): value is string =>
      available.languages.includes(value),
    ),
  };
}
