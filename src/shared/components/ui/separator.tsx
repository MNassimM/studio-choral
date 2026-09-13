"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/shared/utils/cn";

/**
 * Trait de séparation, horizontal ou vertical.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @param orientation - Sens du trait.
 * @returns Le séparateur rendu.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
