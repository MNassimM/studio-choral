"use client";

import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import { useTranslations } from "next-intl";
import { CircleHelp, ShoppingCart } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { usePriceFormatter } from "@/components/cart/cart-price";
import { useCart } from "@/components/cart/cart-provider";
import { MovementPanelSwitcher } from "@/components/work/movement-panel-switcher";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { keepSelectable, toggleOffer } from "@/lib/works/voice-selection";
import type {
  MovementOfferGroup,
  OwnedOfferView,
} from "@/lib/works/work-page-view-model";

/**
 * Une ligne du tableau, avec sa case et son prix.
 */
function OfferRow({
  offer,
  checked,
  onToggle,
}: {
  offer: OwnedOfferView;
  checked: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("work.workPage");
  const tCard = useTranslations("work.card");
  const { has } = useCart();

  const inCart = has(offer.sku);
  const featured = offer.allVoices !== null;
  const labelId = useId();

  if (offer.alreadyOwned) {
    return (
      <li className="flex items-center gap-3 px-3 py-2.5 opacity-60">
        <Checkbox checked disabled aria-labelledby={labelId} />
        <span id={labelId} className="flex flex-1 items-center gap-2 text-sm">
          {offer.voiceLabel ?? t("offersAllVoicesLabel")}
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {t("extendAccessAlreadyOwnedBadge")}
          </span>
          <span className="sr-only">{t("offersOwnedReason")}</span>
        </span>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 px-3 py-2.5",
        featured && "rounded-lg border-l-2 border-primary bg-primary/10 py-3.5",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        aria-labelledby={labelId}
        className="mt-0.5 cursor-pointer"
      />
      <span className="flex flex-1 flex-col gap-0.5">
        <span id={labelId} className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm", featured && "font-medium")}>
            {offer.voiceLabel ?? t("offersAllVoicesLabel")}
          </span>
          {inCart ? (
            <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs text-primary">
              {tCard("inCart")}
            </span>
          ) : null}
          {featured ? (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              {t("extendAccessFeaturedBadge")}
            </span>
          ) : null}
        </span>
        {offer.allVoices ? (
          <span className="text-xs text-muted-foreground">
            {t("offersAllVoicesMeta", {
              count: offer.allVoices.voiceCount,
              tutti: t("extendAccessBulletTuttiDownload"),
            })}
            {offer.allVoices.savingLabel
              ? " · " +
                t("offersSaving", { amount: offer.allVoices.savingLabel })
              : ""}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-sm">
        {offer.discount ? (
          <span className="flex flex-col items-end gap-0.5">
            <span
              aria-hidden="true"
              className="text-muted-foreground line-through"
            >
              {offer.discount.originalPriceLabel}
            </span>
            <span className="font-medium text-primary">
              {offer.discount.discountedPriceLabel}
            </span>
            <span className="sr-only">
              {t("extendAccessDiscountOriginalPriceSr", {
                price: offer.discount.originalPriceLabel,
              })}
            </span>
          </span>
        ) : (
          <span className={cn(featured && "font-medium")}>
            {offer.priceLabel}
          </span>
        )}
      </span>
    </li>
  );
}

/**
 * Tableau de sélection d'un périmètre, avec son pied de total.
 */
function OfferTable({ offers }: { offers: OwnedOfferView[] }) {
  const t = useTranslations("work.workPage");
  const tCard = useTranslations("work.card");
  const formatPrice = usePriceFormatter();
  const { addMany, has, remove } = useCart();
  const [selected, setSelected] = useState<string[]>([]);

  const selectable = useMemo(
    () =>
      offers
        .filter((offer) => !offer.alreadyOwned)
        .map((offer) => ({ sku: offer.sku, coverage: offer.coverage })),
    [offers],
  );

  const chosen = keepSelectable(selected, selectable);
  const chosenOffers = offers.filter((offer) => chosen.includes(offer.sku));
  const currency = offers[0]?.currency ?? "EUR";
  const totalCents = chosenOffers.reduce(
    (somme, offer) => somme + offer.priceCents,
    0,
  );

  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("extendAccessMovementFullyOwnedNotice")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <p className="border-b border-border bg-card/40 px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
          {t("offersInclusionsHeading")} · {t("extendAccessBulletPredominant")}{" "}
          · {t("extendAccessBulletMix")} · {t("extendAccessBulletTempo")}
        </p>
        <ul
          role="group"
          aria-label={t("offersGroupLabel")}
          className="flex flex-col divide-y divide-border"
        >
          {offers.map((offer) => (
            <OfferRow
              key={offer.sku}
              offer={offer}
              checked={chosen.includes(offer.sku) || has(offer.sku)}
              onToggle={() => {
                if (has(offer.sku)) {
                  remove(offer.sku);
                  return;
                }
                setSelected((current) =>
                  toggleOffer(current, offer, selectable),
                );
              }}
            />
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">{t("offersAutoUncheck")}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {t("offersSelectedCount", { count: chosen.length })}
          </span>
          <span className="text-lg font-semibold" aria-live="polite">
            {formatPrice(totalCents, currency)}
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={chosen.length === 0}
          onClick={() => addMany(chosenOffers)}
          className="w-full cursor-pointer rounded-full"
        >
          <ShoppingCart className="size-4" aria-hidden="true" />
          {tCard("addToCart")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("offersReassurance")}
        </p>
      </div>
    </div>
  );
}

/**
 * Onglets Par mouvement et Par oeuvre, avec le tableau de sélection.
 *
 * @param movementGroups - Offres de chaque mouvement.
 * @param workOffers - Offres portant sur l'oeuvre entière.
 * @param defaultMovementId - Mouvement affiché au premier rendu.
 * @returns Le sélecteur rendu.
 */
function OfferSelector({
  movementGroups,
  workOffers,
  defaultMovementId,
}: {
  movementGroups: MovementOfferGroup[];
  workOffers: OwnedOfferView[];
  defaultMovementId: string;
}) {
  const t = useTranslations("work.workPage");
  const hasMovements = movementGroups.length > 0;

  return (
    <Tabs.Root defaultValue={hasMovements ? "movement" : "work"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs.List className="flex gap-2">
          {hasMovements ? (
            <Tabs.Tab
              value="movement"
              className="cursor-pointer rounded-lg border border-transparent px-3 py-1.5 text-sm aria-selected:border-primary/40 aria-selected:bg-primary/15 aria-selected:text-primary"
            >
              {t("offersScopeMovement")}
            </Tabs.Tab>
          ) : null}
          <Tabs.Tab
            value="work"
            className="cursor-pointer rounded-lg border border-transparent px-3 py-1.5 text-sm aria-selected:border-primary/40 aria-selected:bg-primary/15 aria-selected:text-primary"
          >
            {t("offersScopeWork")}
          </Tabs.Tab>
        </Tabs.List>

        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              />
            }
          >
            <CircleHelp className="size-4" aria-hidden="true" />
            {t("offersDifferenceLabel")}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner side="bottom" align="end" sideOffset={8}>
              <Tooltip.Popup className="z-50 flex max-w-xs flex-col gap-2 rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
                <span>{t("offersDifferenceMovement")}</span>
                <span>{t("offersDifferenceWork")}</span>
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>

      {hasMovements ? (
        <Tabs.Panel value="movement" className="mt-3 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("offersScopeMovementHint")}
          </p>
          <MovementPanelSwitcher
            selectorLabel={t("movementSelectorLabel")}
            defaultMovementId={defaultMovementId}
            movements={movementGroups.map((group) => ({
              id: group.movementId,
              label: group.movementTitle,
              panel: <OfferTable offers={group.offers} />,
            }))}
          />
        </Tabs.Panel>
      ) : null}

      <Tabs.Panel value="work" className="mt-3 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t("offersScopeWorkHint")}
        </p>
        <OfferTable offers={workOffers} />
      </Tabs.Panel>
    </Tabs.Root>
  );
}

export { OfferSelector };
