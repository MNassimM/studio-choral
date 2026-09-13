import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";

import { Container } from "@/shared/components/site/container";
import { Logo } from "@/shared/components/site/logo";
import { Separator } from "@/shared/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { mainNavItems } from "@/shared/components/site/main-nav";

const footerNavItems = [
  ...mainNavItems,
  { key: "library", href: "/bibliotheque" },
] as const;

const footerInfoItems = [
  { messageKey: "linkAboutUs", href: "/a-propos" },
  { messageKey: "linkTerms", href: "/conditions-generales" },
  { messageKey: "linkLegal", href: "/mentions-legales" },
  { messageKey: "linkPrivacy", href: "/confidentialite" },
] as const;

/**
 * Icône Facebook en SVG inline.
 *
 * @param className - Classes appliquées au SVG.
 * @returns L'icône rendue.
 */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 9h2.5V6h-2.5c-1.7 0-3 1.3-3 3v2H9v3h2v6h3v-6h2.3l.7-3h-3V9c0-.6.4-1 1-1Z" />
    </svg>
  );
}

/**
 * Icône Instagram en SVG inline.
 *
 * @param className - Classes appliquées au SVG.
 * @returns L'icône rendue.
 */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M16.2 7.8h.01" />
    </svg>
  );
}

/**
 * Icône YouTube en SVG inline.
 *
 * @param className - Classes appliquées au SVG.
 * @returns L'icône rendue.
 */
function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="6.5" width="18" height="11" rx="3" />
      <path d="M10.5 9.8v4.4l4-2.2-4-2.2Z" />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Butterfly-Chœur-de-chambre/61579272361631/",
    Icon: FacebookIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/choeur.butterfly/",
    Icon: InstagramIcon,
  },
  { label: "YouTube", href: "#", Icon: YoutubeIcon },
  {
    label: "Email",
    href: "mailto:contact@butterfly-studio-choral.com",
    Icon: Mail,
  },
];

/**
 * Pied de page du site.
 *
 * @returns Le pied de page rendu.
 */
async function Footer() {
  const tCommon = await getTranslations("common");
  const t = await getTranslations("navigation");

  return (
    <footer className="border-t border-border bg-background">
      <Container className="pt-12 md:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              {tCommon("siteTagline")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("footer.navigationHeading")}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.key === "library"
                      ? t("footer.linkLibrary")
                      : t(`links.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("footer.informationsHeading")}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerInfoItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {t(`footer.${item.messageKey}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t("footer.followUsHeading")}
            </h3>
            <div className="flex items-center gap-2.5">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="pb-6 text-center text-xs text-muted-foreground">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </Container>
    </footer>
  );
}

export { Footer };
