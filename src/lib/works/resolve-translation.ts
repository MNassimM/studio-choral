import { routing } from "@/i18n/routing";

/**
 * Point de résolution UNIQUE entre une Work (français, langue de référence)
 * et sa WorkTranslation éventuelle pour la locale d'interface active. Aucun
 * composant/fonction ne doit faire de `??` sur une traduction ailleurs que
 * ci-dessous : le jour où une nouvelle langue arrive, seul ce fichier change.
 *
 * `title` null dans WorkTranslation signifie « conserver le titre original »
 * (cas des incipits, ex. « Mille regretz ») - jamais une traduction
 * manquante à combler.
 */

export type WorkTranslationFields = {
  slug: string;
  title: string | null;
  shortDescription: string | null;
  description: string | null;
};

export type TranslatableWork = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  /** Ne doit contenir que la ligne de la locale demandée (filtrée côté requête Prisma), zéro ou une ligne. */
  translations: WorkTranslationFields[];
};

export type ResolvedWorkFields = {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
};

export function resolveWorkTranslation(
  work: TranslatableWork,
  locale: string,
): ResolvedWorkFields {
  // Français = langue de référence portée directement par Work : aucune
  // ligne WorkTranslation à chercher.
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
