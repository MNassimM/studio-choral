import Link from "next/link";
import { Music2, ShoppingCart } from "lucide-react";

import type { WorkCardData } from "@/lib/catalog/work-card-data";
import { formatPriceCents } from "@/lib/products/format-price";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function WorkTableRow({ work }: { work: WorkCardData }) {
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
        {work.movementsCount === 1
          ? "1 mouvement"
          : `${work.movementsCount} mouvements`}
      </td>
      <td className="py-3 pr-4 font-medium">
        {work.fromPriceCents !== null
          ? `À partir de ${formatPriceCents(work.fromPriceCents, work.currency)}`
          : "—"}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/works/${work.slug}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "rounded-full",
            )}
          >
            Voir
          </Link>
          {/* TODO : panier non implémenté */}
          <Button
            disabled
            size="icon"
            variant="ghost"
            aria-label="Ajouter au panier"
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
