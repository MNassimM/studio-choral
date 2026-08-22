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

/**
 * Met à jour un paramètre de l'URL courante et navigue (les autres
 * paramètres - recherche, autre filtre - sont conservés). Retirer le
 * paramètre plutôt que d'écrire sa valeur "par défaut" garde des URLs
 * propres.
 *
 * usePathname/useRouter viennent de next/navigation (pas de @/i18n/navigation)
 * : on ne fait ici que réécrire un paramètre de recherche sur la page
 * courante, jamais changer de route ni de locale.
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
