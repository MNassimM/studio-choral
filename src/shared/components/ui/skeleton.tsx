import { cn } from "@/shared/utils/cn";

/**
 * Bloc de remplacement affiché pendant un chargement.
 *
 * @remarks
 * Masqué aux lecteurs d'écran : un squelette ne dit rien. L'attente est
 * annoncée une seule fois, par LoadingStatus. La pulsation respecte la
 * préférence de mouvement réduit.
 *
 * @param className - Classes de taille et de forme.
 * @returns Le bloc rendu.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
