import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sans ce fichier DANS le segment [locale], une 404 en anglais afficherait le
// texte français du not-found.tsx par défaut de la racine de l'app.
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-4 py-24 text-center sm:py-32">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-md text-muted-foreground">{t("description")}</p>
        <Link
          href="/"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
        >
          {t("backHome")}
        </Link>
      </Container>
    </section>
  );
}
