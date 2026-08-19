"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SORT_OPTIONS,
  type SortValue,
  YEAR_OPTIONS,
  type YearValue,
} from "@/components/catalog/catalog-options";

/**
 * Met à jour un paramètre de l'URL courante et navigue (les autres
 * paramètres — recherche, autre filtre — sont conservés). Retirer le
 * paramètre plutôt que d'écrire sa valeur "par défaut" garde des URLs
 * propres.
 */
function useUpdateSearchParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (key: string, value: string, defaultValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };
}

function SortSelect({ value }: { value: SortValue }) {
  const updateSearchParam = useUpdateSearchParam();

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) {
          updateSearchParam("sort", next, "featured");
        }
      }}
    >
      <SelectTrigger aria-label="Trier les œuvres" className="w-full sm:w-48">
        <SelectValue>
          {(current: SortValue | null) =>
            SORT_OPTIONS.find((option) => option.value === current)?.label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function YearSelect({ value }: { value: YearValue }) {
  const updateSearchParam = useUpdateSearchParam();

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) {
          updateSearchParam("year", next, "all");
        }
      }}
    >
      <SelectTrigger
        aria-label="Filtrer par période"
        className="w-full sm:w-56"
      >
        <SelectValue>
          {(current: YearValue | null) =>
            YEAR_OPTIONS.find((option) => option.value === current)?.label
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {YEAR_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { SortSelect, YearSelect };
