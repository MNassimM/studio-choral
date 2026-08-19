import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { ChevronRight, Headphones, Music2, ShoppingCart } from "lucide-react";

import type { WorkCardData } from "@/lib/catalog/work-card-data";
import { formatPriceCents } from "@/lib/products/format-price";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function WorkCard({ work, variant = "default", className }: WorkCardProps) {
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
            href={`/works/${work.slug}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Découvrir
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
          <Badge variant="secondary">{work.voicing}</Badge>
          {work.movementsCount > 1 ? (
            <Badge variant="secondary">{work.movementsCount} mouvements</Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Headphones className="size-4 shrink-0" aria-hidden="true" />
          Aperçu gratuit · Packs par voix
        </div>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {work.fromPriceCents !== null ? (
            <p className="text-sm text-muted-foreground">
              À partir de{" "}
              <span className="font-semibold text-foreground">
                {formatPriceCents(work.fromPriceCents, work.currency)}
              </span>
            </p>
          ) : null}
          {work.fullPackPriceCents !== null ? (
            <p className="text-xs text-muted-foreground">
              Pack complet :{" "}
              {formatPriceCents(work.fullPackPriceCents, work.currency)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/works/${work.slug}`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "flex-1 rounded-full",
            )}
          >
            Voir l&apos;œuvre
          </Link>
          {/* TODO : panier non implémenté */}
          <Button disabled className="flex-1 gap-1.5 rounded-full">
            <ShoppingCart className="size-4" />
            Ajouter au panier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { WorkCard };
export type { WorkCardProps };
