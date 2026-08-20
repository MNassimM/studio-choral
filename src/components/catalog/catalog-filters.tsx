"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type FilterCategoryKey = "period" | "voicing" | "language";

type FilterCategory = {
  key: FilterCategoryKey;
  label: string;
  options: { value: string; label: string }[];
};

type DraftState = Record<FilterCategoryKey, Set<string>>;

function emptyDraft(): DraftState {
  return { period: new Set(), voicing: new Set(), language: new Set() };
}

type FiltersContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  activeCount: number;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

function useFiltersContext(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error(
      "CatalogFiltersButton doit être utilisé à l'intérieur de CatalogFiltersPanel",
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
 * Fournit l'état (ouverture + cases cochées avant validation) au bouton
 * "Filtres" et au panneau, positionnés à deux endroits différents du DOM
 * (le bouton dans la barre d'outils, le panneau en pleine largeur juste en
 * dessous) — d'où le Context plutôt qu'un simple useState local au bouton.
 * `children` (recherche, tri, bascule vue) reste serveur : seul ce wrapper
 * et le bouton sont client.
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
    const params = new URLSearchParams(searchParams.toString());
    for (const category of categories) {
      const values = [...next[category.key]];
      if (values.length > 0) {
        params.set(category.key, values.join(","));
      } else {
        params.delete(category.key);
      }
    }
    const query = params.toString();
    router.push(query ? `/catalogue?${query}` : "/catalogue");
    setOpen(false);
  }

  const activeCount =
    activePeriods.length + activeVoicings.length + activeLanguages.length;

  return (
    <FiltersContext.Provider value={{ open, setOpen, activeCount }}>
      <div ref={wrapperRef} className="relative">
        {children}
        {open ? (
          <div className="absolute top-full z-20 mt-2 rounded-2xl border border-border bg-background p-6 shadow-lg right-0">
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {categories.map((category) => (
                <div
                  key={category.key}
                  className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                >
                  <span className="text-sm font-semibold">
                    {category.label}
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
                Effacer les filtres
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => applyAndClose(draft)}
              >
                Voir les résultats
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </FiltersContext.Provider>
  );
}

/**
 * Bouton "Filtres" — doit être rendu dans les `children` de
 * `CatalogFiltersPanel` pour accéder au Context.
 */
function CatalogFiltersButton() {
  const { open, setOpen, activeCount } = useFiltersContext();

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
      Filtres
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
