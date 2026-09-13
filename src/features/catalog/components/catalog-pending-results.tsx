"use client";

import { useLinkStatus } from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/shared/utils/cn";

/**
 * L'attente d'une navigation dans le catalogue.
 *
 * @remarks
 * Trier, filtrer, paginer ou changer de vue ne quitte pas la page : aucun
 * loading.tsx ne s'affiche. Sans cet état, les anciens résultats restent
 * figés sans le moindre indice. Trois sources d'attente sont réunies ici :
 * une transition pour le tri et les filtres, useLinkStatus pour les liens,
 * useFormStatus pour la bascule de vue.
 */

type CatalogPendingValue = {
  pending: boolean;
  startTransition: TransitionStartFunction;
  report: (source: string, pending: boolean) => void;
};

const CatalogPendingContext = createContext<CatalogPendingValue | null>(null);

/**
 * Fournit l'état d'attente à toute la page du catalogue.
 *
 * @param children - Contenu de la page.
 * @returns Le fournisseur rendu.
 */
function CatalogPendingProvider({ children }: { children: ReactNode }) {
  const [inTransition, startTransition] = useTransition();
  const [sources, setSources] = useState<ReadonlySet<string>>(() => new Set());

  const report = useCallback((source: string, pending: boolean) => {
    setSources((current) => {
      if (current.has(source) === pending) return current;
      const next = new Set(current);
      if (pending) next.add(source);
      else next.delete(source);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      pending: inTransition || sources.size > 0,
      startTransition,
      report,
    }),
    [inTransition, sources, startTransition, report],
  );

  return (
    <CatalogPendingContext.Provider value={value}>
      {children}
    </CatalogPendingContext.Provider>
  );
}

/**
 * Rend la fonction qui déclare une navigation du catalogue comme attente.
 *
 * @returns startTransition, ou un appel direct hors du catalogue.
 */
function useCatalogTransition(): TransitionStartFunction {
  const context = useContext(CatalogPendingContext);
  return context?.startTransition ?? ((callback) => void callback());
}

/**
 * Signale une attente au fournisseur, et la retire au démontage.
 *
 * @param pending - Vrai tant que la source attend.
 */
function useReportPending(pending: boolean) {
  const report = useContext(CatalogPendingContext)?.report;
  const source = useId();

  useEffect(() => {
    if (!report) return;
    report(source, pending);
    // Un lien peut disparaître en pleine navigation : sans ce retrait,
    // l'attente resterait affichée pour toujours.
    return () => report(source, false);
  }, [report, source, pending]);
}

/**
 * À placer dans un Link du catalogue pour que son clic estompe les résultats.
 *
 * @returns Rien, le composant n'affiche pas.
 */
function LinkPendingReporter() {
  const { pending } = useLinkStatus();
  useReportPending(pending);
  return null;
}

/**
 * À placer dans un formulaire du catalogue pour la même raison.
 *
 * @returns Rien, le composant n'affiche pas.
 */
function FormPendingReporter() {
  const { pending } = useFormStatus();
  useReportPending(pending);
  return null;
}

/**
 * Enveloppe les résultats et les estompe pendant une navigation.
 *
 * @param children - Résultats et pagination.
 * @returns La zone rendue.
 */
function CatalogResults({ children }: { children: ReactNode }) {
  const pending = useContext(CatalogPendingContext)?.pending ?? false;

  return (
    <div
      aria-busy={pending}
      className={cn(
        "flex flex-col gap-8 transition-opacity duration-200 motion-reduce:transition-none",
        pending && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </div>
  );
}

export {
  CatalogPendingProvider,
  CatalogResults,
  FormPendingReporter,
  LinkPendingReporter,
  useCatalogTransition,
};
