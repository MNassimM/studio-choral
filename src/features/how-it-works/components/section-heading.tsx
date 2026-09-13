import { cn } from "@/shared/utils/cn";

// Trait décoratif fin - volontairement un simple div plutôt que le composant
// Separator partagé : celui-ci impose data-horizontal:w-full avec la même
// spécificité qu'un override d'instance (ex. w-12), donc une largeur réduite
// ne le bat jamais de façon fiable. Purement ornemental ici (pas de rôle
// separator ARIA à porter), donc aria-hidden.
/**
 * Trait décoratif court, purement ornemental.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le trait rendu.
 */
function OrnamentalRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("h-px w-12 bg-border", className)} />
  );
}

/**
 * Titre de section, souligné de son trait décoratif.
 *
 * @param children - Intitulé de la section.
 * @returns Le titre rendu.
 */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="text-xs font-semibold tracking-[0.3em] text-primary uppercase">
        {children}
      </h2>
      <OrnamentalRule />
    </div>
  );
}

export { OrnamentalRule, SectionHeading };
