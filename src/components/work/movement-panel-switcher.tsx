"use client";

import { useState } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MovementSwitcherOption = {
  id: string;
  label: string;
  /** Contenu déjà résolu côté serveur (droits déjà appliqués) - ce composant ne fait que choisir lequel afficher, jamais de logique de droits. */
  panel: React.ReactNode;
};

/**
 * Sélecteur de mouvement générique, réutilisé indépendamment par les
 * téléchargements et par les offres « par mouvement » : chaque montage a son
 * propre état (deux instances sur la page = deux sélections indépendantes,
 * jamais synchronisées entre elles).
 *
 * Ne reçoit que des panneaux DÉJÀ RENDUS côté serveur (droits déjà résolus) -
 * bascule laquelle est visible, ne calcule jamais quoi que ce soit à partir
 * des droits. Toutes les pistes/offres de tous les mouvements sont déjà dans
 * le DOM (comme la grille de téléchargements elle-même, qui affiche aussi les
 * fichiers verrouillés) ; seul l'affichage est basculé, pas la donnée.
 */
function MovementPanelSwitcher({
  movements,
  defaultMovementId,
  selectorLabel,
}: {
  movements: MovementSwitcherOption[];
  defaultMovementId: string;
  selectorLabel: string;
}) {
  const [selectedId, setSelectedId] = useState(defaultMovementId);
  const selectedLabel =
    movements.find((movement) => movement.id === selectedId)?.label ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-xs flex-col gap-1.5 text-sm">
        <Select
          value={selectedId}
          onValueChange={(value) => {
            if (value) setSelectedId(value);
          }}
        >
          {/* SelectPrimitive.Label (pas le SelectLabel du wrapper ui/select,
              qui est en réalité un GroupLabel destiné à l'intérieur du popup) :
              seul ce composant relie un libellé visible au déclencheur Base UI
              - un <label htmlFor> natif n'a pas prise sur un bouton Base UI. */}
          <SelectPrimitive.Label className="text-muted-foreground">
            {selectorLabel}
          </SelectPrimitive.Label>
          <SelectTrigger className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-transparent dark:hover:bg-transparent">
            <SelectValue>{() => selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {movements.map((movement) => (
              <SelectItem key={movement.id} value={movement.id}>
                {movement.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {movements.map((movement) => (
        <div
          key={movement.id}
          className={cn(movement.id !== selectedId && "hidden")}
        >
          {movement.panel}
        </div>
      ))}
    </div>
  );
}

export { MovementPanelSwitcher };
export type { MovementSwitcherOption };
