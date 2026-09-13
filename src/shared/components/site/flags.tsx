import { cn } from "@/shared/utils/cn";

/**
 * Drapeau français, recadré en cercle.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le drapeau rendu.
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

/**
 * Drapeau britannique, recadré en cercle.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le drapeau rendu.
 */
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
