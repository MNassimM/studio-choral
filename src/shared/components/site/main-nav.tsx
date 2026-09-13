import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

export const mainNavItems = [
  { key: "catalogue", href: "/catalogue" },
  { key: "howItWorks", href: "/comment-ca-marche" },
] as const;

/**
 * Navigation principale, affichée à partir du point de rupture md (pour les mobiles).
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns La navigation rendue.
 */
async function MainNav({ className }: { className?: string }) {
  const t = await getTranslations("navigation");

  return (
    <nav className={cn("hidden items-center gap-8 md:flex", className)}>
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
        >
          {t(`links.${item.key}`)}
        </Link>
      ))}
    </nav>
  );
}

export { MainNav };
