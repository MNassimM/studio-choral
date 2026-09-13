import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";

import { isPublishedWorkSlug } from "@/features/work/server/published-work";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Vérifie que l'œuvre existe avant l'écran de chargement.
 *
 * @remarks
 * loading.tsx enveloppe la page, pas ce layout. Un notFound() levé ici part
 * donc avant le début du streaming, avec un vrai statut 404. Levé dans la
 * page, la réponse serait déjà partie en 200.
 *
 * La vérification reste légère : Next précharge ce layout pour chaque lien
 * visible vers une œuvre, sans aller jusqu'à la page.
 *
 * @param props - Page enveloppée et paramètres de route.
 * @returns La page, si l'œuvre existe.
 */
export default async function WorkLayout({
  children,
  params,
}: LayoutProps<"/[locale]/works/[slug]">) {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const { slug } = await params;

  if (!(await isPublishedWorkSlug(slug, locale))) {
    notFound();
  }

  return children;
}
