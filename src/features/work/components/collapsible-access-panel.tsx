"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Etat repliable du panneau « Votre accès ».
 *
 * @remarks
 * Il s'ouvre par défaut si l'utilisateur possède déjà un pupitre.
 *
 * @param expandLabel - Libellé accessible du bouton d'ouverture.
 * @param collapseLabel - Libellé accessible du bouton de fermeture.
 * @param children - Contenu du panneau, déjà rendu côté serveur.
 * @param movements - Mouvements et pupitres, lus pour l'état d'ouverture initial.
 * @returns Le panneau rendu.
 */
function CollapsibleAccessPanel({
  expandLabel,
  collapseLabel,
  children,
  movements,
}: {
  expandLabel: string;
  collapseLabel: string;
  children: React.ReactNode;
  movements: {
    voices: { code: string; label: string; owned: boolean }[];
  }[];
}) {
  const ownsAnything = movements.some((movement) =>
    movement.voices.some((voice) => voice.owned),
  );
  const [open, setOpen] = useState(ownsAnything);

  return (
    <div
      className="hidden 2xl:fixed 2xl:top-20 2xl:right-4 2xl:z-30 2xl:block 2xl:w-60 2xl:transition-transform 2xl:duration-300 2xl:ease-out"
      style={{ transform: open ? "translateX(0)" : "translateX(calc(100% ))" }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? collapseLabel : expandLabel}
        aria-expanded={open}
        className="absolute top-1/2 -left-4 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-accent"
      >
        {open ? (
          <ChevronRight className="size-4" aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-4" aria-hidden="true" />
        )}
      </button>
      <div className="max-h-[calc(100vh-6rem)] w-60 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export { CollapsibleAccessPanel };
