import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

/**
 * Page 404 racine, hors de tout segment de locale.
 *
 * @remarks
 * Sert de repli pour les URL qui n'atteignent jamais le segment de locale, par
 * exemple un préfixe de langue inconnu. Son texte est en français et n'est pas
 * traduit, aucun contexte de langue n'étant disponible à ce niveau. Les 404
 * survenant à l'intérieur d'une locale passent par la page 404 localisée.
 *
 * @returns La page rendue.
 */
export default async function LocaleNotFound() {

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-4 py-24 text-center sm:py-32">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Page introuvable
        </h1>
        <p className="max-w-md text-muted-foreground">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <a
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
        >
            Retour à l'accueil
        </a>
      </Container>
    </section>
  );
}
