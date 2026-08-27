"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";

import { cn } from "@/lib/utils";
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react";

/**
 * Racine du menu déroulant, qui porte la valeur et le gestionnaire de changement.
 *
 * @param modal - Verrouille le défilement et neutralise les interactions
 * extérieures. Faux par défaut, contrairement à Base UI.
 * @returns La racine rendue.
 */
function Select<Value, Multiple extends boolean | undefined = false>({
  modal = false,
  ...props
}: SelectPrimitive.Root.Props<Value, Multiple>) {
  return <SelectPrimitive.Root modal={modal} {...props} />;
}

/**
 * Groupe d'items à l'intérieur du popup.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le groupe rendu.
 */
function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

/**
 * Valeur sélectionnée, affichée dans le déclencheur.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns La valeur rendue.
 */
function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  );
}

/**
 * Bouton qui ouvre le popup et affiche la valeur courante.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @param size - Gabarit du déclencheur.
 * @param children - Contenu du déclencheur, en pratique la valeur sélectionnée.
 * @returns Le déclencheur rendu, chevron compris.
 */
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  );
}

/**
 * Popup du menu déroulant, portail et positionnement compris.
 *
 * @remarks
 * L'alignement sur le déclencheur est désactivé par défaut, alors que Base UI
 * l'active. Ce mode fait recouvrir le déclencheur par le popup, à la manière
 * d'un menu déroulant natif, mais il fige la position du popup et impose donc
 * le verrouillage du défilement, indépendamment du réglage `modal` de la
 * racine. C'est le second des deux réglages nécessaires pour que la page reste
 * défilable, voir le commentaire de `Select` ci dessus.
 *
 * Le popup s'ouvre donc sous le déclencheur et le suit pendant le défilement.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @param children - Items du menu.
 * @param side - Côté du déclencheur où ouvrir le popup.
 * @param sideOffset - Écart entre le popup et le déclencheur.
 * @param align - Alignement du popup sur le déclencheur.
 * @param alignOffset - Décalage appliqué à cet alignement.
 * @param alignItemWithTrigger - Aligne l'item sélectionné sur la valeur du déclencheur.
 * @returns Le popup rendu, avec ses flèches de défilement.
 */
function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

/**
 * Étiquette d'un groupe d'items dans le popup.
 *
 * @remarks
 * Ce n'est pas l'étiquette du déclencheur. Pour relier un libellé visible au
 * déclencheur, utiliser Select.Label de Base UI.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns L'étiquette rendue.
 */
function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Item sélectionnable du menu.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @param children - Libellé de l'item.
 * @returns L'item rendu, avec sa coche de sélection.
 */
function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/**
 * Trait de séparation entre deux groupes d'items.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le séparateur rendu.
 */
function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

/**
 * Flèche de défilement vers le haut, affichée quand la liste déborde.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns La flèche rendue.
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  );
}

/**
 * Flèche de défilement vers le bas, affichée quand la liste déborde.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns La flèche rendue.
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
