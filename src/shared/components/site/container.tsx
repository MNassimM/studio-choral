import { cn } from "@/shared/utils/cn";

/**
 * Conteneur centré qui applique la largeur et les marges sur le coté du site.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le conteneur rendu.
 */
function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

export { Container };
