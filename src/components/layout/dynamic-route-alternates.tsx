"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { AppLocale } from "@/i18n/routing";

/**
 * Pont entre une page à segment dynamique (ex. /works/[slug]) et le
 * LanguageSwitcher global du header : next-intl retraduit les segments
 * STATIQUES d'un chemin en changeant de locale, jamais la VALEUR d'un
 * paramètre — le slug d'une œuvre diffère par locale (WorkTranslation.slug)
 * et n'a aucun moyen d'être connu côté client sans base de données.
 *
 * La page fournit donc la correspondance locale -> valeur traduite via
 * <SyncDynamicRouteAlternates>, et LanguageSwitcher (rendu dans le layout
 * racine, hors de l'arbre de la page) la lit ici. Header et page ne sont
 * PAS dans une relation ancêtre/descendant l'un de l'autre : ce Contexte doit
 * donc envelopper les deux depuis le layout, pas depuis la page elle-même.
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

function DynamicRouteAlternatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alternates, setAlternates] = useState<DynamicRouteAlternates>(null);

  return (
    <DynamicRouteAlternatesContext.Provider value={{ alternates, setAlternates }}>
      {children}
    </DynamicRouteAlternatesContext.Provider>
  );
}

function useDynamicRouteAlternates(): DynamicRouteAlternates {
  return useContext(DynamicRouteAlternatesContext).alternates;
}

/**
 * À monter une fois dans une page à segment dynamique, avec la valeur
 * traduite du paramètre pour chaque locale (ex. { fr: "messe-en-sol-majeur",
 * en: "mass-in-g-major" }). Ne rend rien ; se contente de publier la
 * correspondance pour le LanguageSwitcher, et la retire au démontage pour
 * qu'une page suivante sans segment dynamique ne l'hérite pas par erreur.
 */
function SyncDynamicRouteAlternates({
  alternates,
}: {
  alternates: Partial<Record<AppLocale, string>>;
}) {
  const { setAlternates } = useContext(DynamicRouteAlternatesContext);
  // Deux locales fixes ("fr"/"en") : on dépend des valeurs primitives plutôt
  // que de l'objet `alternates` (une nouvelle référence à chaque rendu
  // serveur) pour éviter de réarmer l'effet inutilement.
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
