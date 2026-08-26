import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";

/**
 * Bibliothèque personnelle de l'utilisateur.
 *
 * @remarks
 * Espace réservé volontairement minimal, au même titre que la page de compte.
 * Il sert à vérifier que la garde tient sur plusieurs routes et non sur une
 * seule, la liste réelle des œuvres possédées restant à construire.
 *
 * @returns La page rendue.
 */
export default async function LibraryPage() {
  const t = await getTranslations("auth.protected");

  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-4 py-16 sm:py-24">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("libraryHeading")}
          </h1>
          <Badge variant="outline">{t("placeholderTitle")}</Badge>
        </div>
        <p className="max-w-xl text-muted-foreground">{t("libraryBody")}</p>
      </Container>
    </section>
  );
}
