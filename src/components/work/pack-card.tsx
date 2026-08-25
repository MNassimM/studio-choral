import { CheckCircle2, Music2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AllVoicesDiscountView,
  SimpleOfferView,
} from "@/lib/works/work-page-view-model";

/**
 * Carte d'une offre achetable.
 *
 * @remarks
 * Affiche le prix remisé à côté du prix catalogue barré lorsqu'une remise est
 * fournie. Une offre déjà possédée est grisée et perd ses boutons d'achat.
 *
 * @param offer - Offre à présenter.
 * @param bullets - Avantages listés sur la carte.
 * @param addToCartLabel - Libellé du bouton d'ajout au panier.
 * @param byItNowLabel - Libellé du bouton d'achat immédiat.
 * @param featured - Met la carte en avant.
 * @param featuredBadge - Libellé de la pastille de mise en avant.
 * @param alreadyOwned - Grise la carte et retire les boutons d'achat.
 * @param alreadyOwnedBadge - Libellé de la pastille d'offre déjà possédée.
 * @param unlocksLabel - Libellé introduisant les pupitres débloqués en plus.
 * @param unlocksVoices - Pupitres débloqués en plus par cette offre.
 * @param size - Gabarit de la carte.
 * @param discount - Remise à afficher, ou null si le prix catalogue s'applique.
 * @param discountBadgeLabel - Libellé de la pastille de remise, déjà interpolé.
 * @param discountOriginalPriceSrLabel - Formulation du prix barré pour les lecteurs d'écran.
 * @returns La carte rendue.
 */
function PackCard({
  offer,
  bullets,
  addToCartLabel,
  byItNowLabel,
  featured = false,
  featuredBadge,
  alreadyOwned = false,
  alreadyOwnedBadge,
  unlocksLabel,
  unlocksVoices,
  size = "default",
  discount,
  discountBadgeLabel,
  discountOriginalPriceSrLabel,
}: {
  offer: SimpleOfferView;
  bullets: string[];
  addToCartLabel: string;
  byItNowLabel: string;
  featured?: boolean;
  featuredBadge?: string;
  alreadyOwned?: boolean;
  alreadyOwnedBadge?: string;
  unlocksLabel?: string;
  unlocksVoices?: string[];
  size?: "default" | "sm";
  discount?: AllVoicesDiscountView | null;
  discountBadgeLabel?: string;
  discountOriginalPriceSrLabel?: string;
}) {
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-2xl border text-center",
        isSmall ? "p-4" : "p-6",
        alreadyOwned
          ? "border-border bg-muted/30 opacity-60"
          : featured
            ? "border-primary bg-card shadow-md ring-1 ring-primary/30"
            : "border-border bg-card shadow-sm",
      )}
    >
      {alreadyOwned && alreadyOwnedBadge ? (
        <Badge
          variant="outline"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-background"
        >
          {alreadyOwnedBadge}
        </Badge>
      ) : featured && featuredBadge ? (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          {featuredBadge}
        </Badge>
      ) : null}

      <div
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          isSmall ? "size-9" : "size-14",
          alreadyOwned
            ? "bg-muted text-muted-foreground"
            : "bg-secondary text-primary",
        )}
      >
        <Music2 className={isSmall ? "size-4" : "size-6"} />
      </div>

      <span className={cn("font-medium", isSmall ? "text-xs" : "text-sm")}>
        {offer.name}
      </span>
      {!alreadyOwned && discount && discount.percentOff > 0 ? (
        <span className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
          <del
            aria-label={discountOriginalPriceSrLabel}
            className={cn(
              "font-medium text-muted-foreground line-through",
              isSmall ? "text-sm" : "text-lg",
            )}
          >
            <span aria-hidden="true">{discount.originalPriceLabel}</span>
          </del>
          <span
            className={cn(
              "font-semibold text-primary",
              isSmall ? "text-lg" : "text-3xl",
            )}
          >
            {discount.discountedPriceLabel}
          </span>
          {discountBadgeLabel ? (
            <Badge variant="secondary">{discountBadgeLabel}</Badge>
          ) : null}
        </span>
      ) : (
        <span
          className={cn(
            "font-semibold",
            alreadyOwned ? "text-muted-foreground" : "text-primary",
            isSmall ? "text-lg" : "text-3xl",
          )}
        >
          {offer.priceLabel}
        </span>
      )}

      {!alreadyOwned &&
      unlocksLabel &&
      unlocksVoices &&
      unlocksVoices.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {unlocksLabel} {unlocksVoices.join(", ")}
        </p>
      ) : null}

      <ul
        className={cn(
          "flex flex-col gap-1 text-muted-foreground",
          isSmall ? "text-xs" : "text-sm",
        )}
      >
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-1.5 text-start">
            <CheckCircle2
              className={cn(
                "shrink-0 text-primary",
                isSmall ? "size-3" : "size-3.5",
              )}
              aria-hidden="true"
            />
            {bullet}
          </li>
        ))}
      </ul>

      {alreadyOwned ? null : (
        // TODO : panier non implémenté
        <>
        <Button
          disabled
          size={isSmall ? "sm" : "default"}
          className="mt-2 w-full rounded-full"
        >
          {addToCartLabel}
        </Button>
        <Button
          disabled
          size={isSmall ? "sm" : "default"}
          className="w-full rounded-full bg-secondary text-text-primary-foreground hover:bg-secondary/90"
        >
          {byItNowLabel}
        </Button>
        </>
      )}
    </div>
  );
}

export { PackCard };
