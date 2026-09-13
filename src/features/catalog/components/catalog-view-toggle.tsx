import { getTranslations } from "next-intl/server";
import { LayoutGrid, List } from "lucide-react";

import { FormPendingReporter } from "@/features/catalog/components/catalog-pending-results";
import { buttonVariants } from "@/shared/components/ui/button";
import { rememberCatalogView } from "@/features/catalog/server/view-preference-actions";
import { type CatalogView } from "@/features/catalog/domain/view-preference";
import { cn } from "@/shared/utils/cn";

type CatalogViewToggleProps = {
  view: CatalogView;
};

/**
 * Bascule entre la vue grille et la vue tableau du catalogue.
 *
 * @param view - Vue actuellement active.
 * @returns La bascule rendue.
 */
async function CatalogViewToggle({ view }: CatalogViewToggleProps) {
  const t = await getTranslations("catalogue.viewToggle");

  return (
    <form
      action={rememberCatalogView}
      role="group"
      aria-label={t("groupAriaLabel")}
      className="inline-flex items-center gap-1 rounded-full border border-border p-1"
    >
      <FormPendingReporter />
      <button
        type="submit"
        name="view"
        value="grid"
        aria-label={t("gridAriaLabel")}
        aria-pressed={view === "grid"}
        className={cn(
          buttonVariants({
            variant: view === "grid" ? "default" : "ghost",
            size: "icon",
          }),
          "rounded-full",
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="submit"
        name="view"
        value="list"
        aria-label={t("listAriaLabel")}
        aria-pressed={view === "list"}
        className={cn(
          buttonVariants({
            variant: view === "list" ? "default" : "ghost",
            size: "icon",
          }),
          "rounded-full",
        )}
      >
        <List className="size-4" />
      </button>
    </form>
  );
}

export { CatalogViewToggle };
