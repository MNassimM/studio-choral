import { routing } from "@/i18n/routing";

/**
 * Point de résolution unique entre une oeuvre et sa traduction éventuelle.
 *
 * @remarks
 * Le français est la langue de référence, les autres langues sont dans WorkTranslation.
 */

/**
 * Champs traduisibles d'une oeuvre, pour une langue donnée.
 */
export type WorkTranslationFields = {
  slug: string;
  /**
   * Un titre nul signifie conserver le titre original.
   */
  title: string | null;
  shortDescription: string | null;
  description: string | null;
};

/**
 * Oeuvre accompagnée de ses traductions, telle qu'attendue en entrée.
 */
export type TranslatableWork = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  translations: WorkTranslationFields[];
};

/**
 * Champs d'une oeuvre une fois la langue résolue.
 */
export type ResolvedWorkFields = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
};

/**
 * Résout les champs d'une oeuvre dans la langue d'interface demandée.
 *
 * @param work - Oeuvre avec au plus une traduction, celle de la locale visée.
 * @param locale - Locale d'interface active.
 * @returns Les champs prêts à afficher.
 */
export function resolveWorkTranslation(
  work: TranslatableWork,
  locale: string,
): ResolvedWorkFields {
  if (locale === routing.defaultLocale) {
    return {
      slug: work.slug,
      title: work.title,
      shortDescription: work.shortDescription,
      description: work.description,
    };
  }

  const translation = work.translations[0];

  return {
    slug: translation?.slug ?? work.slug,
    title: translation?.title ?? work.title,
    shortDescription: translation?.shortDescription ?? work.shortDescription,
    description: translation?.description ?? work.description,
  };
}
