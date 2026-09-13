import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { MailCheck } from "lucide-react";

import { Container } from "@/shared/components/site/container";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { MAGIC_LINK_MAX_AGE_SECONDS } from "@/features/auth/server/env";
import { cn } from "@/shared/utils/cn";

/**
 * Construit les métadonnées de la page de confirmation d'envoi.
 *
 * @returns Le titre, la description et les liens alternatifs par locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const t = await getTranslations("auth.verifyRequest");

  const languages = Object.fromEntries(
    routing.locales.map((l) => [
      l,
      getPathname({ href: "/verification", locale: l }),
    ]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ href: "/verification", locale }),
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
    // Une page de confirmation n'a aucune valeur dans un index de recherche et
    // pourrait laisser croire à une étape publique du parcours.
    robots: { index: false, follow: false },
  };
}

/**
 * Page de confirmation affichée après une demande de lien.
 *
 * @remarks
 * Le texte est délibérément conditionnel et ne confirme jamais qu'un compte existe pour l'adresse saisie.
 * Afficher un message différent selon que l'adresse est connue transformerait cette page en outil d'énumération de comptes.
 *
 * L'adresse saisie n'est pas reprise à l'écran, pour que la page reste sans conséquence si elle est rouverte ou partagée depuis un historique.
 *
 * @returns La page rendue.
 */
export default async function VerifyRequestPage() {
  const t = await getTranslations("auth.verifyRequest");
  const minutes = Math.round(MAGIC_LINK_MAX_AGE_SECONDS / 60);

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center py-16 sm:py-24">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <MailCheck className="size-6" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {t("heading")}
          </h1>

          <p className="text-sm text-muted-foreground">{t("body")}</p>
          <p className="text-sm text-muted-foreground">
            {t("expiryNotice", { minutes })}
          </p>
          <p className="text-xs text-muted-foreground">{t("spamNotice")}</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/connexion"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full",
              )}
            >
              {t("backToSignIn")}
            </Link>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "rounded-full",
              )}
            >
              {t("backHome")}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
