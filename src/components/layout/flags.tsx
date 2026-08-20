import { cn } from "@/lib/utils";

/**
 * SVG inline, jamais d'emoji drapeau (🇫🇷/🇬🇧) : Windows ne fournit pas les
 * glyphes correspondants et les affiche en lettres brutes ("FR"/"GB") sur une
 * grande partie des postes — un bug silencieux, invisible depuis macOS.
 *
 * Le recadrage en cercle fait partie du composant lui-même (pas de la
 * responsabilité de l'appelant) : un wrapper span rounded-full+overflow-hidden
 * contient un SVG en "xMidYMid slice" qui déborde puis se fait rogner, plutôt
 * qu'un clipPath SVG — évite toute collision d'id si plusieurs instances du
 * même drapeau sont montées à la fois (bouton + ligne de menu, desktop +
 * mobile).
 */
function FranceFlag({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-5 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      <svg
        viewBox="0 0 3 2"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <rect width="1" height="2" x="0" fill="#0055A4" />
        <rect width="1" height="2" x="1" fill="#FFFFFF" />
        <rect width="1" height="2" x="2" fill="#EF4135" />
      </svg>
    </span>
  );
}

function UnitedKingdomFlag({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-5 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      <svg
        viewBox="0 0 60 36"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
      >
        <rect width="60" height="36" fill="#00247D" />
        <path d="M0 0 L60 36 M60 0 L0 36" stroke="#FFFFFF" strokeWidth="8" />
        <path d="M0 0 L60 36 M60 0 L0 36" stroke="#CF142B" strokeWidth="4" />
        <path d="M30 0 V36 M0 18 H60" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M30 0 V36 M0 18 H60" stroke="#CF142B" strokeWidth="7.2" />
      </svg>
    </span>
  );
}

export { FranceFlag, UnitedKingdomFlag };
