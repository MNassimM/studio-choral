"use client";

import { Children, useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";

/** Ce qu'il faut savoir d'une oeuvre pour la filtrer, sans la rendre. */
export type LibraryListItem = {
  workId: string;
  searchText: string;
  ownsFullWork: boolean;
};

type Filtre = "all" | "full" | "partial";

/**
 * Recherche et filtre de la bibliothèque.
 *
 * @param items - Métadonnées des oeuvres, dans l'ordre des cartes.
 * @param children - Les cartes rendues côté serveur.
 * @returns La barre d'outils et les cartes retenues.
 */
export function LibraryList({
  items,
  children,
}: {
  items: LibraryListItem[];
  children: ReactNode;
}) {
  const t = useTranslations("library");
  const searchId = useId();
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("all");

  const cartes = Children.toArray(children);
  const completes = items.filter((item) => item.ownsFullWork).length;

  const retenues = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return items
      .map((item, index) => ({ item, carte: cartes[index] }))
      .filter(
        ({ item }) =>
          (filtre === "all" ||
            (filtre === "full" ? item.ownsFullWork : !item.ownsFullWork)) &&
          (q === "" || item.searchText.includes(q)),
      );
    // cartes est recréé à chaque rendu par Children.toArray : le mémo suit les
    // seules entrées qui décident du filtrage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, recherche, filtre]);

  const onglets: { valeur: Filtre; libelle: string; compte: number }[] = [
    { valeur: "all", libelle: t("filterAll"), compte: items.length },
    { valeur: "full", libelle: t("filterFull"), compte: completes },
    {
      valeur: "partial",
      libelle: t("filterPartial"),
      compte: items.length - completes,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchAriaLabel")}
            className="rounded-full pl-9"
          />
        </div>

        <div
          role="group"
          aria-label={t("filterLabel")}
          className="flex w-fit items-center gap-1 rounded-full border border-border p-1"
        >
          {onglets.map((onglet) => (
            <button
              key={onglet.valeur}
              type="button"
              aria-pressed={filtre === onglet.valeur}
              onClick={() => setFiltre(onglet.valeur)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filtre === onglet.valeur
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {onglet.libelle}{" "}
              <span className="tabular-nums opacity-70">{onglet.compte}</span>
            </button>
          ))}
        </div>
      </div>

      {retenues.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {t("noMatch")}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {retenues.map(({ item, carte }) => (
            <div key={item.workId}>{carte}</div>
          ))}
        </div>
      )}
    </div>
  );
}
