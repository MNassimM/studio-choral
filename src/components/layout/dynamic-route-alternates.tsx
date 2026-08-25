"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { AppLocale } from "@/i18n/routing";

/**
 * Correspondance entre une locale et la valeur traduite du segment dynamique.
 *
 * @remarks
 * Vaut null en dehors d'une route à segment dynamique.
 */
type DynamicRouteAlternates = Partial<Record<AppLocale, string>> | null;

type ContextValue = {
  alternates: DynamicRouteAlternates;
  setAlternates: (value: DynamicRouteAlternates) => void;
};

const DynamicRouteAlternatesContext = createContext<ContextValue>({
  alternates: null,
  setAlternates: () => {},
});

/**
 * Fournit la correspondance locale vers valeur de segment au reste de l'arbre.
 *
 * @param children - Sous arbre ayant accès au contexte.
 * @returns Le fournisseur rendu.
 */
function DynamicRouteAlternatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alternates, setAlternates] = useState<DynamicRouteAlternates>(null);

  return (
    <DynamicRouteAlternatesContext.Provider
      value={{ alternates, setAlternates }}
    >
      {children}
    </DynamicRouteAlternatesContext.Provider>
  );
}

/**
 * Lit la correspondance locale vers valeur de segment publiée par la page.
 *
 * @returns La correspondance courante, ou null hors d'une route dynamique.
 */
function useDynamicRouteAlternates(): DynamicRouteAlternates {
  return useContext(DynamicRouteAlternatesContext).alternates;
}

/**
 * Publie la valeur traduite du segment dynamique pour chaque locale.
 *
 * @remarks
 * Ne rend rien. Retire la correspondance au démontage pour qu'une page sans
 * segment dynamique n'en hérite pas.
 *
 * @param alternates - Valeur du segment par locale.
 * @returns Rien.
 */
function SyncDynamicRouteAlternates({
  alternates,
}: {
  alternates: Partial<Record<AppLocale, string>>;
}) {
  const { setAlternates } = useContext(DynamicRouteAlternatesContext);
  // On dépend des valeurs primitives plutôt que de l'objet lui même, qui
  // change de référence à chaque rendu serveur.
  const fr = alternates.fr;
  const en = alternates.en;

  useEffect(() => {
    setAlternates({ fr, en });
    return () => setAlternates(null);
  }, [fr, en, setAlternates]);

  return null;
}

export {
  DynamicRouteAlternatesProvider,
  SyncDynamicRouteAlternates,
  useDynamicRouteAlternates,
};
