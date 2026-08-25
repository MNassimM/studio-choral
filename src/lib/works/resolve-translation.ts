import { routing } from "@/i18n/routing";

/**
 * Point de résolution unique entre une œuvre et sa traduction éventuelle.
 *
 * @remarks
 * Le français est la langue de référence, portée directement par la ligne
 * Work. Les autres langues vivent dans WorkTranslation.
 *
 * Aucun composant ni aucune fonction ne doit faire de repli sur une
 * traduction ailleurs qu'ici. Le jour où une nouvelle langue arrive, seul ce
 * fichier change.
 */

/**
 * Champs traduisibles d'une œuvre, pour une langue donnée.
 */
export type WorkTranslationFields = {
  slug: string;
  /**
   * Un titre nul signifie « conserver le titre original ».
   *
   * @remarks
   * C'est le cas des incipits comme « Mille regretz », qui ne se traduisent
   * jamais. Ce n'est donc pas une traduction manquante à combler un jour.
   */
  title: string | null;
  shortDescription: string | null;
  description: string | null;
};

/**
 * Œuvre accompagnée de ses traductions, telle qu'attendue en entrée.
 */
export type TranslatableWork = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  /**
   * Ne doit contenir que la ligne de la locale demandée, donc zéro ou une
   * seule. Le filtrage se fait côté requête Prisma, voir buildWorkCardInclude.
   */
  translations: WorkTranslationFields[];
};

/**
 * Champs d'une œuvre une fois la langue résolue.
 */
export type ResolvedWorkFields = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
};

/**
 * Résout les champs d'une œuvre dans la langue d'interface demandée.
 *
 * @remarks
 * En français, aucune ligne de traduction n'est cherchée : les valeurs sont
 * déjà portées par l'œuvre elle même.
 *
 * Pour les autres langues, chaque champ retombe individuellement sur la
 * valeur française s'il est absent de la traduction. Un titre traduit
 * manquant n'empêche donc pas une description traduite de s'afficher.
 *
 * @param work - Œuvre avec au plus une traduction, celle de la locale visée.
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
