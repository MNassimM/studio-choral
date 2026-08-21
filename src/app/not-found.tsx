import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./globals.css";

// Sans ce fichier DANS le segment [locale], une 404 en anglais afficherait le
// texte français du not-found.tsx par défaut de la racine de l'app.
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
