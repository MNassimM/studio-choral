import { getTranslations } from "next-intl/server";
import { Lock, SlidersVertical } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Encart du studio de répétition, verrouillé ou déverrouillé.
 *
 * @param unlocked - Vrai si au moins un mouvement est débloqué.
 * @returns L'encart rendu.
 */
async function StudioPlaceholder({ unlocked }: { unlocked: boolean }) {
  const t = await getTranslations("work.workPage");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-6",
        unlocked
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-secondary/20",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            unlocked
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {unlocked ? (
            <SlidersVertical className="size-5" />
          ) : (
            <Lock className="size-5" />
          )}
        </div>
        <h2 className="text-lg font-semibold">{t("studioHeading")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("studioDescription")}</p>
      {!unlocked ? (
        <p className="text-sm font-medium text-muted-foreground">
          {t("studioLockedNotice")}
        </p>
      ) : null}
      {/* TODO : Studio audio - étape suivante */}
    </div>
  );
}

export { StudioPlaceholder };
