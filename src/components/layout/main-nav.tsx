import Link from "next/link";

import { cn } from "@/lib/utils";

const mainNavItems = [
  { label: "Catalogue", href: "/catalogue" },
  { label: "Bibliothèque", href: "/bibliotheque" },
  { label: "Comment ça marche", href: "/comment-ca-marche" },
];

function MainNav({ className }: { className?: string }) {
  return (
    <nav className={cn("hidden items-center gap-8 md:flex", className)}>
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-foreground/75 transition-colors hover:text-primary"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export { MainNav, mainNavItems };
