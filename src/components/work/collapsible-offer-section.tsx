"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Section repliable de « Étendre votre accès » (par mouvement / par œuvre) :
 * tout le bandeau (titre + flèche) est cliquable et bascule l'affichage des
 * cartes en dessous, pour libérer de la place. Les cartes restent montées
 * (juste masquées en CSS), même logique que MovementPanelSwitcher.
 */
function CollapsibleOfferSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronDown
          className={cn("size-4 transition-transform", !open && "-rotate-90")}
          aria-hidden="true"
        />
        {heading}
      </button>
      <div className={cn(!open && "hidden")}>{children}</div>
    </div>
  );
}

export { CollapsibleOfferSection };
