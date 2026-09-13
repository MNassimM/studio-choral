import { requireSession } from "@/features/auth/server/require-session";

/**
 * Toutes les pages de ce groupe dépendent de la session, aucune ne peut donc
 * être rendue à l'avance ni mise en cache.
 */
export const dynamic = "force-dynamic";

/**
 * Gabarit des pages exigeant une session ouverte.
 *
 * @remarks
 * Le groupe de routes entre parenthèses n'apparaît pas dans les URL, il ne
 * sert qu'à réunir les pages protégées sous ce gabarit. Protéger une nouvelle
 * page revient donc à déposer son fichier dans ce dossier, sans avoir à
 * penser à appeler quoi que ce soit ni à modifier une liste de routes.
 *
 * La garde est appelée ici plutôt que dans chaque page parce qu'un oubli
 * passerait inaperçu. Un gabarit ne peut pas être contourné par la page qu'il
 * enveloppe.
 *
 * @param children - Page protégée à rendre une fois la session vérifiée.
 * @returns Le contenu de la page, ou rien si la garde a redirigé.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return <>{children}</>;
}
