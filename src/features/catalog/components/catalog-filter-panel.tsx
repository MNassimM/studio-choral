"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useCatalogTransition } from "@/features/catalog/components/catalog-pending-results";
import { useRouter } from "@/i18n/navigation";
import { PAGE_PARAM } from "@/features/catalog/domain/catalog-params";
import { cn } from "@/shared/utils/cn";

type FilterCategoryKey = "period" | "voicing" | "language";

type FilterCategory = {
  key: FilterCategoryKey;
  /** Clé de message dans catalogue.filters, ex. "period" -> catalogue.filters.period. */
  label: "period" | "voicing" | "language";
  options: { value: string; label: string }[];
};

type DraftState = Record<FilterCategoryKey, Set<string>>;

/**
 * Crée un brouillon de filtres vide.
 *
 * @returns Un brouillon sans aucune valeur cochée.
 */
function emptyDraft(): DraftState {
  return { period: new Set(), voicing: new Set(), language: new Set() };
}

type FiltersContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeCount: number;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

/**
 * Accède au contexte partagé entre le panneau et son bouton.
 *
 * @returns L'état d'ouverture et le nombre de filtres actifs.
 * @throws {Error} Si le bouton est monté hors du panneau.
 */
function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error(
      "CatalogFiltersButton must be used inside CatalogFiltersPanel",
    );
  }
  return ctx;
}

type CatalogFiltersPanelProps = {
  categories: FilterCategory[];
  activePeriods: string[];
  activeVoicings: string[];
  activeLanguages: string[];
  children: ReactNode;
};

/**
 * Panneau de filtres du catalogue.
 *
 * @remarks
 * Les cases cochées ne sont appliquées à l'URL qu'à la validation.
 * Le panneau se ferme sur clic extérieur ou sur Échap.
 *
 * @param categories - Catégories de filtres et leurs options disponibles.
 * @param activePeriods - Périodes déjà actives dans l'URL.
 * @param activeVoicings - Formations déjà actives dans l'URL.
 * @param activeLanguages - Langues déjà actives dans l'URL.
 * @param children - Barre d'outils rendue au dessus du panneau.
 * @returns Le panneau rendu, avec son fournisseur de contexte.
 */
function CatalogFiltersPanel({
  categories,
  activePeriods,
  activeVoicings,
  activeLanguages,
  children,
}: CatalogFiltersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startTransition = useCatalogTransition();
  const t = useTranslations("catalogue.filters");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => ({
    period: new Set(activePeriods),
    voicing: new Set(activeVoicings),
    language: new Set(activeLanguages),
  }));
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleValue(categoryKey: FilterCategoryKey, value: string) {
    setDraft((prev) => {
      const next = new Set(prev[categoryKey]);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, [categoryKey]: next };
    });
  }

  function applyAndClose(next: DraftState) {
    const query: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      // La page tombe avec les filtres : l'ensemble des résultats change.
      if (
        key === PAGE_PARAM ||
        key === "period" ||
        key === "voicing" ||
        key === "language"
      ) {
        continue;
      }
      query[key] = value;
    }
    for (const category of categories) {
      const values = [...next[category.key]];
      if (values.length > 0) {
        query[category.key] = values.join(",");
      }
    }
    startTransition(() => {
      router.push({ pathname: "/catalogue", query });
    });
    setOpen(false);
  }

  const activeCount =
    activePeriods.length + activeVoicings.length + activeLanguages.length;

  return (
    <FiltersContext.Provider value={{ open, setOpen, activeCount }}>
      <div ref={wrapperRef} className="relative">
        {children}
        {open ? (
          <div className="absolute top-full right-0 z-20 mt-2 max-w-3xl rounded-2xl border border-border bg-background p-6 shadow-lg">
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {categories.map((category) => (
                <div
                  key={category.key}
                  className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                >
                  <span className="text-sm font-semibold">
                    {t(category.label)}
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {category.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 text-sm text-foreground/90"
                      >
                        <Checkbox
                          checked={draft[category.key].has(option.value)}
                          onCheckedChange={() =>
                            toggleValue(category.key, option.value)
                          }
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 rounded-full"
                onClick={() => {
                  const empty = emptyDraft();
                  setDraft(empty);
                  applyAndClose(empty);
                }}
              >
                <RotateCcw className="size-4" />
                {t("clear")}
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => applyAndClose(draft)}
              >
                {t("viewResults")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </FiltersContext.Provider>
  );
}

/**
 * Bouton d'ouverture du panneau de filtres.
 *
 * @remarks
 * Doit être rendu dans les enfants de CatalogFiltersPanel pour accéder au contexte. (On le fait dans la page.tsx du catalogue)
 *
 * @returns Le bouton rendu.
 */
function CatalogFiltersButton() {
  const { open, setOpen, activeCount } = useFiltersContext();
  const t = useTranslations("catalogue.filters");

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="true"
      onClick={() => setOpen(!open)}
      className={cn(
        buttonVariants({ variant: open ? "default" : "outline" }),
        "gap-1.5 rounded-full",
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      {t("button")}
      {activeCount > 0 ? (
        <Badge variant="secondary" className="px-1.5 sm:hidden">
          {activeCount}
        </Badge>
      ) : null}
      <ChevronDown
        className={cn("size-4 transition-transform", open && "rotate-180")}
        aria-hidden="true"
      />
    </button>
  );
}

export { CatalogFiltersButton, CatalogFiltersPanel };
export type { FilterCategory };
