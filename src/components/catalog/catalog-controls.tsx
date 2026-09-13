"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

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
} from "@/components/catalog/catalog-options";
import { useCatalogTransition } from "@/components/catalog/catalog-pending";
import { PAGE_PARAM } from "@/lib/catalog/catalog-params";

/**
 * Rend une fonction qui réécrit un paramètre de l'URL courante.
 *
 * @returns Une fonction qui prend la clé, la valeur et la valeur par défaut.
 */
function useUpdateSearchParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startTransition = useCatalogTransition();

  return (key: string, value: string, defaultValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete(PAGE_PARAM);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  };
}

/**
 * Sélecteur de tri du catalogue.
 *
 * @param value - Tri actuellement actif.
 * @returns Le sélecteur rendu.
 */
function SortSelect({ value }: { value: SortValue }) {
  const updateSearchParam = useUpdateSearchParam();
  const t = useTranslations("catalogue");

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) {
          updateSearchParam("sort", next, "featured");
        }
      }}
    >
      <SelectTrigger aria-label={t("sortAriaLabel")} className="w-full sm:w-48">
        <SelectValue>
          {(current: SortValue | null) =>
            current ? t(`sortOptions.${current}`) : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {t(`sortOptions.${option}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { SortSelect };
