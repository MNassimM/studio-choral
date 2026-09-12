import { getTranslations, getFormatter } from "next-intl/server";
import { Playfair_Display } from "next/font/google";
import { ChevronRight, Headphones, Music2 } from "lucide-react";

import { isKnownWorkLanguageCode } from "@/lib/works/work-language";

import type { WorkCardData } from "@/lib/catalog/work-card-data";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * [PLACEHOLDER]Visuel de remplacement affiché à la place de la pochette.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le visuel rendu.
 */
function WorkCoverPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-secondary text-primary",
        className,
      )}
    >
      {/* TODO coverImageKey est vide pour l'instant : emplacement réservé au bon
          ratio, sans référencer de fichier inexistant. Le jour où une image
          existe, ce bloc devient un next/image pointant vers l'URL signée. */}
      <Music2 className="size-8" aria-hidden="true" />
    </div>
  );
}

type WorkCardProps = {
  work: WorkCardData;
  variant?: "default" | "compact";
  className?: string;
};

/**
 * Carte œuvre du catalogue et de la page d'accueil.
 *
 * @remarks
 * La variante par défaut est celle du catalogue (affiche badges et prix).
 * La variante compacte se limite au visuel, au résumé et à un lien de découverte.
 *
 * @param work - Données d'affichage de l'œuvre.
 * @param variant - Densité de la carte.
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns La carte rendue.
 */
async function WorkCard({
  work,
  variant = "default",
  className,
}: WorkCardProps) {
  const t = await getTranslations("work");
  const format = await getFormatter();
  const workHref = {
    pathname: "/works/[slug]",
    params: { slug: work.slug },
  } as const;

  if (variant === "compact") {
    return (
      <Card className={cn("overflow-hidden pt-0", className)}>
        <WorkCoverPlaceholder className="h-32" />
        <CardHeader>
          <CardTitle className={cn("text-lg", playfairDisplay.className)}>
            {work.title}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{work.composer}</span>
            {work.catalogueRef ? (
              <Badge variant="outline">{work.catalogueRef}</Badge>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {work.shortDescription ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {work.shortDescription}
            </p>
          ) : null}
          <Link
            href={workHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("card.discover")}
            <ChevronRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  function translateWorkLanguage(code: string): string {
    return isKnownWorkLanguageCode(code) ? t(`language.${code}`) : code;
  }

  return (
    <Link
      href={workHref}
      className={cn(
        "block h-full rounded-xl transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Card className="hover:bg-secondary/20 focus-within:bg-secondary/20 flex h-full flex-col overflow-hidden pt-0 transition-shadow hover:shadow-md ">
        <WorkCoverPlaceholder className="h-40" />
        <CardHeader>
          <CardTitle
            className={cn(
              "flex flex-wrap items-center gap-2",
              "text-lg",
              playfairDisplay.className,
            )}
          >
            {work.title}
            {work.catalogueRef ? (
              <Badge variant="outline">{work.catalogueRef}</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>{work.composer}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {work.period ? (
              <Badge variant="secondary">{t(`period.${work.period}`)}</Badge>
            ) : null}
            {work.voicing ? (
              <Badge variant="secondary">{work.voicing}</Badge>
            ) : null}
            {work.movementsCount > 1 ? (
              <Badge variant="secondary">
                {t("card.movementsCount", { count: work.movementsCount })}
              </Badge>
            ) : null}
            {work.language ? (
              <Badge variant="secondary">
                {translateWorkLanguage(work.language)}
              </Badge>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Headphones className="size-4 shrink-0" aria-hidden="true" />
            {t("card.inclusionsLine")}
          </div>

          <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
            {work.fromPriceCents !== null ? (
              <p className="text-sm text-muted-foreground">
                {t("card.fromPrice")}{" "}
                <span className="font-semibold text-foreground">
                  {format.number(work.fromPriceCents / 100, {
                    style: "currency",
                    currency: work.currency,
                  })}
                </span>
              </p>
            ) : null}
            {work.fullPackPriceCents !== null ? (
              <p className="text-xs text-muted-foreground">
                {t("card.fullPack")}{" "}
                {format.number(work.fullPackPriceCents / 100, {
                  style: "currency",
                  currency: work.currency,
                })}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export { WorkCard };
export type { WorkCardProps };
