import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";

import { Header } from "@/components/layout/header";
import { CartAddPanel } from "@/components/cart/cart-add-panel";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartReplaceDialog } from "@/components/cart/cart-replace-dialog";
import { Footer } from "@/components/layout/footer";
import { routing } from "@/i18n/routing";
import { DynamicRouteAlternatesProvider } from "@/components/layout/dynamic-route-alternates";

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
 * @remarks
 * Valide la locale demandée et bascule en 404 si elle est inconnue. Monte
 * ensuite les fournisseurs de traduction et de segments traduits, puis
 * l'en tête et le pied de page autour du contenu.
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

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`+"overflow-auto scrollbar-thumb-primary scrollbar-track-backgroun"}
    >
      <body className="dark">
        <NextIntlClientProvider>
          <DynamicRouteAlternatesProvider>
            <CartProvider>
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
