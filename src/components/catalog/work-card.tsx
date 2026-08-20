import { getTranslations, getFormatter } from "next-intl/server";
import { Playfair_Display } from "next/font/google";
import { ChevronRight, Headphones, Music2, ShoppingCart } from "lucide-react";

import type { WorkCardData } from "@/lib/catalog/work-card-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Police serif locale à ce composant, pour les titres d'œuvre — cohérente
// avec le grand titre serif de la page d'accueil (next/font dédup le fichier
// de police réellement chargé même si l'appel a lieu à plusieurs endroits).
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

function WorkCoverPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-secondary text-primary",
        className,
      )}
    >
      {/* coverImageKey est vide pour l'instant : emplacement réservé au bon
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

async function WorkCard({
  work,
  variant = "default",
  className,
}: WorkCardProps) {
  const t = await getTranslations("workCard");
  const tPeriod = await getTranslations("periodOptions");
  const format = await getFormatter();

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
            href={{ pathname: "/works/[slug]", params: { slug: work.slug } }}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("discover")}
            <ChevronRight className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("flex h-full flex-col overflow-hidden pt-0", className)}
    >
      <WorkCoverPlaceholder className="h-40" />
      <CardHeader>
        <CardTitle className={cn("text-lg", playfairDisplay.className)}>
          {work.title}
        </CardTitle>
        <CardDescription>{work.composer}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {work.catalogueRef ? (
            <Badge variant="outline">{work.catalogueRef}</Badge>
          ) : null}
          {work.period ? (
            <Badge variant="secondary">{tPeriod(work.period)}</Badge>
          ) : null}
          {work.voicing ? (
            <Badge variant="secondary">{work.voicing}</Badge>
          ) : null}
          {work.movementsCount > 1 ? (
            <Badge variant="secondary">
              {t("movementsCount", { count: work.movementsCount })}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Headphones className="size-4 shrink-0" aria-hidden="true" />
          {t("inclusionsLine")}
        </div>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {work.fromPriceCents !== null ? (
            <p className="text-sm text-muted-foreground">
              {t("fromPrice")}{" "}
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
              {t("fullPack")}{" "}
              {format.number(work.fullPackPriceCents / 100, {
                style: "currency",
                currency: work.currency,
              })}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={{ pathname: "/works/[slug]", params: { slug: work.slug } }}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 rounded-full",
            )}
          >
            {t("viewWork")}
          </Link>
          {/* TODO : panier non implémenté */}
          <Button disabled className="flex-1 gap-1.5 rounded-full">
            <ShoppingCart className="size-4" />
            {t("addToCart")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { WorkCard };
export type { WorkCardProps };
