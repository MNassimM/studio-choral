import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Href = clé canonique de routing.pathnames (jamais le segment traduit en
// dur) ; le libellé est résolu séparément par chaque consommateur (ici et
// mobile-nav.tsx) via son propre appel de traduction, serveur ou client.
export const mainNavItems = [
  { key: "catalogue", href: "/catalogue" },
  { key: "howItWorks", href: "/comment-ca-marche" },
] as const;

async function MainNav({ className }: { className?: string }) {
  const t = await getTranslations("nav");

  return (
    <nav className={cn("hidden items-center gap-8 md:flex", className)}>
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}

export { MainNav };
