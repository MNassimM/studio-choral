"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Info,
  Lock,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import {
  CartLineGroups,
  CartWorkCover,
} from "@/components/cart/cart-line-list";
import { useCart } from "@/components/cart/cart-provider";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { groupCartLines, type CartWorkGroup } from "@/lib/cart/cart-grouping";
import { cn } from "@/lib/utils";

/**
 * Carte d'une oeuvre présente dans le panier.
 *
 * Une oeuvre à mouvement unique n'affiche ni compteur de mouvements, ni colonne
 * de mouvement, le titre de la carte suffisant à la nommer.
 *
 * @param group - Lignes du panier appartenant à cette oeuvre.
 * @param titleClassName - Classe de police appliquée au titre de l'oeuvre.
 * @returns La carte rendue.
 */
function CartWorkCard({
  group,
  titleClassName,
}: {
  group: CartWorkGroup;
  titleClassName?: string;
}) {
  const t = useTranslations("cart.page");
  const tCard = useTranslations("work.card");
  const { lineOf } = useCart();

  const movementCount =
    group.groups
      .flatMap((subgroup) => subgroup.lines)
      .map((line) => lineOf(line.sku)?.workMovementCount ?? 0)
      .find((count) => count > 0) ?? 0;

  const composer =
    group.groups
      .flatMap((subgroup) => subgroup.lines)
      .map((line) => lineOf(line.sku)?.workComposer ?? null)
      .find((value) => value !== null) ?? null;

  const lines = group.groups.flatMap((subgroup) => subgroup.lines);
  const workHref = {
    pathname: "/works/[slug]",
    params: { slug: group.groups[0].lines[0].sku.split(":")[0] }, // TODO: remplacer par workSlug quand disponible
  } as const;

  return (
    <Link href={workHref} className="group">
      <section className="rounded-md border border-border bg-card/40 p-2 sm:p-2 hover:bg-card/60 transition-colors">
        {" "}
        {/*rounded-2xl border border-border bg-card/40 p-4 sm:p-6 hover:bg-card/60 transition-colors*/}
        <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
          <div className="flex items-center h-fit gap-4 sm:w-80 sm:shrink-0">
            <CartWorkCover />
            <div className="flex min-w-0 flex-col gap-1">
              <h2
                className={cn(
                  "text-lg leading-tight tracking-tight sm:text-xl",
                  titleClassName,
                )}
              >
                {group.workTitle ?? t("loading")}
              </h2>
              {composer ? (
                <p className="text-sm text-primary">{composer}</p>
              ) : null}
              {group.splitByMovement && movementCount > 0 ? (
                <p className="mt-1 w-fit rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {tCard("movementsCount", { count: movementCount })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {group.splitByMovement ? (
              <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">
                {t("movementsLabel")}
              </p>
            ) : (
              <p className="mb-1 text-xs tracking-wide text-muted-foreground uppercase">
                {t("voiceLabel")}
              </p>
            )}
            <CartLineGroups lines={lines} showPrices pageCart />
          </div>
        </div>
      </section>
    </Link>
  );
}

/**
 * Garanties affichées sous le bouton de commande.
 */
const TRUST_POINTS: { key: TrustKey; icon: LucideIcon }[] = [
  { key: "trustSecurePayment", icon: ShieldCheck },
  { key: "trustInstantAccess", icon: BadgeCheck },
  { key: "trustAudioQuality", icon: AudioLines },
];

/**
 * Clés de message des garanties.
 */
type TrustKey =
  "trustSecurePayment" | "trustInstantAccess" | "trustAudioQuality";

/**
 * Colonne latérale du panier, total, commande et garanties.
 *
 * @param count - Nombre d'articles du panier.
 * @returns La colonne rendue.
 */
function CartCheckoutPanel({ count }: { count: number }) {
  const t = useTranslations("cart.page");

  return (
    <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-24 lg:w-80">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-5">
        <p className="text-sm text-muted-foreground">
          {t("itemCount", { count })}
        </p>

        <CartSummary size="lg" />

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {t("securePaymentNotice")}
          </p>
        </div>

        {/* TODO : la commande n est pas implementee, le bouton reste inactif. */}
        <Button
          disabled
          size="lg"
          className="w-full justify-between rounded-xl font-medium"
        >
          <span className="flex-1 text-center">{t("checkout")}</span>
          <Lock className="size-4" aria-hidden="true" />
        </Button>

        <ul className="flex flex-col gap-3">
          {TRUST_POINTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-3 text-sm">
              <Icon
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3 rounded-2xl border border-border bg-card/40 p-4">
        <Info
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t("libraryNotice")}</p>
          <Link
            href="/comment-ca-marche"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t("libraryLink")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

/**
 * Contenu du panier vide, avec son invitation à parcourir le catalogue.
 *
 * @returns L'état vide rendu.
 */
function CartPageEmpty() {
  const t = useTranslations("cart.page");

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-16 text-center">
      <ShoppingCart
        className="size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold">{t("emptyTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
      </div>
      <Link
        href="/catalogue"
        className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
      >
        {t("emptyAction")}
      </Link>
    </div>
  );
}

/**
 * Page panier, une carte encadrée par oeuvre.
 *
 * @param titleClassName - Classe de police appliquée aux titres d'oeuvre.
 * @returns Le contenu de la page rendu.
 */
function CartPageContent({ titleClassName }: { titleClassName?: string }) {
  const t = useTranslations("cart.page");
  const tDrawer = useTranslations("cart.drawer");
  const { items, count, isHydrated, resolvedBySku } = useCart();

  const groups = useMemo(
    () => groupCartLines(items, resolvedBySku),
    [items, resolvedBySku],
  );

  if (!isHydrated) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }

  if (count === 0) {
    return <CartPageEmpty />;
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {groups.map((group) => (
          <CartWorkCard
            key={group.workId}
            group={group}
            titleClassName={titleClassName}
          />
        ))}
        <Link
          href="/catalogue"
          className={cn(
            buttonVariants({ variant: "outlineprimary", size: "lg" }),
            "w-fit rounded-full text-primary px-4",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tDrawer("continueShopping")}
        </Link>
      </div>

      <CartCheckoutPanel count={count} />
    </div>
  );
}

export { CartPageContent };
