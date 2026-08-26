import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { Container } from "@/components/layout/container";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { safeRedirectTarget } from "@/lib/auth/redirect-target";
import { redirect as redirectToPath } from "next/navigation";

import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * La page dépend de la session de l'utilisateur, elle ne peut donc jamais
 * être rendue à l'avance ni mise en cache.
 */
export const dynamic = "force-dynamic";

/**
 * Construit les métadonnées de la page de connexion.
 *
 * @returns Le titre, la description et les liens alternatifs par locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const t = await getTranslations("auth.signIn");

  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, getPathname({ href: "/connexion", locale: l })]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ href: "/connexion", locale }),
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
  };
}

/**
 * Traduit un code d'erreur d'Auth.js en clé de message.
 *
 * @remarks
 * Auth.js renvoie l'utilisateur ici avec un paramètre d'erreur lorsqu'un lien
 * ne peut pas être honoré. Seul le cas d'un jeton refusé mérite une
 * formulation propre, puisque c'est le seul que l'utilisateur peut corriger
 * lui même en redemandant un lien. Tout le reste partage un message générique,
 * détailler des causes internes n'aidant personne et renseignant un attaquant.
 *
 * @param error - Valeur brute du paramètre d'erreur.
 * @returns La clé de message à afficher, ou null si aucune erreur n'est signalée.
 */
function resolveErrorKey(
  error: string | undefined,
): "errorExpiredLink" | "errorGeneric" | null {
  if (!error) return null;
  return error === "Verification" ? "errorExpiredLink" : "errorGeneric";
}

/**
 * Page de connexion par lien magique.
 *
 * @remarks
 * Un utilisateur déjà connecté est redirigé vers l'accueil, un formulaire de
 * connexion n'ayant aucun sens pour lui.
 *
 * La page reste un composant serveur et ne délègue au client que le
 * formulaire, qui est la seule partie réellement interactive.
 *
 * @param props - Paramètres de route et paramètres de recherche.
 * @returns La page rendue.
 */
export default async function SignInPage(
  props: PageProps<"/[locale]/connexion">,
) {
  const searchParams = await props.searchParams;
  // La destination est validée avant toute utilisation. Une valeur refusée
  // retombe sur la racine, un lien forgé perdant ainsi tout effet.
  const nextTarget = safeRedirectTarget(
    typeof searchParams.next === "string" ? searchParams.next : undefined,
  );

  const user = await getCurrentUser();
  if (user) {
    // Un utilisateur déjà connecté qui arrive ici avec une destination est
    // renvoyé dessus, ce qui couvre le cas d'un retour en arrière après
    // connexion.
    //
    // La redirection passe par celle de Next et non par celle de next-intl,
    // parce que la destination est un chemin concret déjà localisé et non une
    // clé de route à composer. La faire passer par next-intl reviendrait à lui
    // demander de traduire un chemin qui l'est déjà.
    redirectToPath(nextTarget);
  }

  const t = await getTranslations("auth.signIn");
  const rawError =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const errorKey = resolveErrorKey(rawError);

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center py-16 sm:py-24">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("heading")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("intro")}</p>
          </div>

          {errorKey ? (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
            >
              <span className="font-medium text-destructive">
                {t("errorTitle")}
              </span>
              <span className="text-destructive/90">{t(errorKey)}</span>
            </div>
          ) : null}

          <SignInForm nextTarget={nextTarget} />
        </div>
      </Container>
    </section>
  );
}
