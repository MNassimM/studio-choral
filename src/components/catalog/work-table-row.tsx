import { getTranslations, getFormatter } from "next-intl/server";
import { Music2, ShoppingCart } from "lucide-react";

import type { WorkCardData } from "@/lib/catalog/work-card-data";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

async function WorkTableRow({ work }: { work: WorkCardData }) {
  const t = await getTranslations("work.card");
  const format = await getFormatter();

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-3 pr-4 pl-4">
        <div
          className="flex size-12 items-center justify-center rounded-md bg-secondary text-primary"
          aria-hidden="true"
        >
          <Music2 className="size-5" />
        </div>
      </td>
      <td className="py-3 pr-4 font-medium">{work.title}</td>
      <td className="py-3 pr-4 text-muted-foreground">{work.composer}</td>
      <td className="py-3 pr-4 text-muted-foreground">{work.voicing ?? "—"}</td>
      <td className="py-3 pr-4 text-muted-foreground">
        {t("movementsCount", { count: work.movementsCount })}
      </td>
      <td className="py-3 pr-4 font-medium">
        {work.fromPriceCents !== null
          ? `${t("fromPrice")} ${format.number(work.fromPriceCents / 100, { style: "currency", currency: work.currency })}`
          : "—"}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <Link
            href={{ pathname: "/works/[slug]", params: { slug: work.slug } }}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-full",
            )}
          >
            {t("viewWorkShort")}
          </Link>
          {/* TODO : panier non implémenté */}
          <Button
            disabled
            size="icon"
            variant="ghost"
            aria-label={t("addToCart")}
            className="rounded-full"
          >
            <ShoppingCart className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export { WorkTableRow };
