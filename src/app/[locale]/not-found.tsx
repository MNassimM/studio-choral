import { getTranslations } from "next-intl/server";

import { Container } from "@/shared/components/site/container";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";

// Sans ce fichier DANS le segment [locale], une 404 en anglais afficherait le
// texte français du not-found.tsx par défaut de la racine de l'app.
/**
 * Page 404 d'une locale.
 *
 * @remarks
 * Sa présence dans le segment de locale est ce qui permet d'afficher le texte
 * traduit. Sans elle, une 404 en anglais reprendrait le texte de la page 404
 * racine.
 *
 * @returns La page rendue.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors.notFound");

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
