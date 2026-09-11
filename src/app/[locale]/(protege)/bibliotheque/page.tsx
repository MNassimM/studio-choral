import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Playfair_Display } from "next/font/google";
import { BookOpen, Download, Music2 } from "lucide-react";

import { Container } from "@/components/layout/container";
import { LibraryList } from "@/components/library/library-list";
import { LibraryWorkCard } from "@/components/library/library-work-card";
import { buttonVariants } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { requireSession } from "@/lib/auth/require-session";
import { findLibraryWorks } from "@/lib/library/library-works";
import { isKnownVoiceCode } from "@/lib/works/voice-label";
import { cn } from "@/lib/utils";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Construit les métadonnées de la bibliothèque.
 *
 * @returns Le titre et la description, sans indexation.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("library");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    // Page privée : rien à indexer, et les liens alternatifs n'ont pas de sens.
    robots: { index: false, follow: false },
  };
}

/**
 * Encart d'un chiffre de la bibliothèque.
 *
 * @param icon - Icône illustrant le chiffre.
 * @param value - Valeur affichée.
 * @param label - Intitulé.
 * @returns L'encart rendu.
 */
function StatBox({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/**
 * Page « Ma bibliothèque ».
 *
 * @returns La page rendue.
 */
export default async function LibraryPage() {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const user = await requireSession();

  const t = await getTranslations("library");
  const tCommon = await getTranslations("common");
  const tWork = await getTranslations("work");

  const { rows, summary } = await findLibraryWorks(user.id, locale, (code) =>
    isKnownVoiceCode(code) ? tWork(`voice.${code}`) : code,
  );

  const returnTo = getPathname({ href: "/bibliotheque", locale });

  return (
    <section className="mx-auto max-w-7xl bg-background">
      <Container className="flex flex-col gap-8 pt-2 pb-12 sm:pt-6 sm:pb-16">
        <nav
          aria-label={tCommon("breadcrumbAriaLabel")}
          className="text-sm text-muted-foreground"
        >
          <Link href="/" className="!underline hover:text-primary">
            {tCommon("breadcrumbHome")}
          </Link>
          <span className="mx-2">-{">"}</span>
          <span aria-current="page" className="text-foreground">
            {t("title")}
          </span>
        </nav>

        <div className="flex flex-col gap-3">
          <h1
            className={cn(
              "text-3xl tracking-tight sm:text-4xl",
              playfairDisplay.className,
            )}
          >
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("intro")}</p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border px-6 py-16 text-center">
            <div
              className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary"
              aria-hidden="true"
            >
              <Music2 className="size-7" />
            </div>
            <h2 className={cn("text-2xl", playfairDisplay.className)}>
              {t("emptyHeading")}
            </h2>
            <p className="max-w-md text-muted-foreground">{t("emptyText")}</p>
            <Link
              href="/catalogue"
              className={cn(
                buttonVariants({ size: "sm" }),
                "mt-2 rounded-full",
              )}
            >
              {t("emptyCta")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatBox
                icon={BookOpen}
                value={String(summary.works)}
                label={t("statWorks")}
              />
              <StatBox
                icon={Music2}
                value={String(summary.movements)}
                label={t("statMovements")}
              />
              <StatBox
                icon={Download}
                value={String(summary.files)}
                label={t("statFiles")}
              />
            </div>

            <LibraryList
              items={rows.map((row) => ({
                workId: row.workId,
                searchText: row.searchText,
                ownsFullWork: row.ownsFullWork,
              }))}
            >
              {rows.map((row) => (
                <LibraryWorkCard
                  key={row.workId}
                  row={row}
                  returnTo={returnTo}
                />
              ))}
            </LibraryList>
          </>
        )}
      </Container>
    </section>
  );
}
