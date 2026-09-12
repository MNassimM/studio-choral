import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";

import { Header } from "@/components/layout/header";
import { CartAddPanel } from "@/components/cart/cart-add-panel";
import { CartProvider } from "@/components/cart/cart-provider";
import { getCurrentUser } from "@/lib/auth/current-user";
import { serializeCart } from "@/lib/cart/cart-serialization";
import { readUserCart } from "@/lib/cart/cart-store";
import { CartReplaceDialog } from "@/components/cart/cart-replace-dialog";
import { Footer } from "@/components/layout/footer";
import { ThemeSync } from "@/components/layout/theme-sync";
import { routing } from "@/i18n/routing";
import { DynamicRouteAlternatesProvider } from "@/components/layout/dynamic-route-alternates";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  parseThemePreference,
  themeClass,
  themeColorScheme,
} from "@/lib/theme/theme-preference";
import { cn } from "@/lib/utils";

/**
 * Applique le thème du système avant le premier rendu.
 *
 * @remarks
 * Uniquement en « system » : le serveur ne peut pas connaître le réglage du
 * visiteur. Le script est inséré dans le document plutôt que chargé, pour
 * s'exécuter avant la peinture et éviter que la page apparaisse dans le
 * mauvais thème.
 *
 * Il ne couvre que le chargement du document. Les rafraîchissements React,
 * dont celui qui suit le choix dans le menu, sont repris par ThemeSync :
 * un script inséré par mise à jour du DOM ne s'exécute pas.
 */
const SCRIPT_THEME_SYSTEME = `(function(){try{var m=matchMedia("(prefers-color-scheme: dark)");var a=function(){var r=document.documentElement;r.classList.toggle("dark",m.matches);r.style.colorScheme=m.matches?"dark":"light"};a();m.addEventListener("change",a)}catch(e){}})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Déclare les locales à prérendre.
 *
 * @returns Un paramètre de route par locale supportée.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Construit les métadonnées communes à toutes les pages d'une locale.
 *
 * @returns Le titre, la description et l'URL de base du site.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");

  return {
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
      : undefined,
    title: t("siteName"),
    description: t("siteTagline"),
  };
}

/**
 * Enveloppe commune à toutes les pages d'une locale.
 *
 * @param children - Page rendue à l'intérieur du gabarit.
 * @returns Le document complet de la locale.
 */
export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!locale || !hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Le panier d'un compte vit en base : on le charge ici pour que la première
  // image soit déjà la bonne. getCurrentUser est mémoïsée, l'en tête la
  // rappellera sans seconde lecture.
  const user = await getCurrentUser();
  const initialCart = serializeCart(user ? await readUserCart(user.id) : []);

  const cookieStore = await cookies();
  const theme =
    parseThemePreference(cookieStore.get(THEME_COOKIE)?.value) ?? DEFAULT_THEME;

  return (
    <html
      lang={locale}
      className={cn(
        geistSans.variable,
        geistMono.variable,
        "overflow-auto scrollbar-thumb-primary scrollbar-track-background",
        themeClass(theme),
      )}
      style={{ colorScheme: themeColorScheme(theme) }}
      suppressHydrationWarning
    >
      {theme === "system" ? (
        <head>
          <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME_SYSTEME }} />
        </head>
      ) : null}
      <body>
        <ThemeSync theme={theme} />
        <NextIntlClientProvider>
          <DynamicRouteAlternatesProvider>
            <CartProvider userId={user?.id ?? null} initialCart={initialCart}>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartAddPanel />
              <CartReplaceDialog />
            </CartProvider>
          </DynamicRouteAlternatesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
