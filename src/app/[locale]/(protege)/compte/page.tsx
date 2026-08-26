import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * Espace personnel de l'utilisateur.
 *
 * @remarks
 * Espace réservé volontairement minimal. Il existe pour donner une cible
 * réelle à la garde de session et pour que la route cesse de tomber en 404,
 * son contenu restant à construire.
 *
 * La page ne rappelle pas la garde. Le gabarit du groupe protégé l'a déjà
 * exécutée, et getCurrentUser étant mémoïsé pour la requête, la lecture de
 * session n'a lieu qu'une fois.
 *
 * @returns La page rendue.
 */
export default async function AccountPage() {
  const t = await getTranslations("auth.protected");
  const user = await getCurrentUser();

  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-4 py-16 sm:py-24">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("accountHeading")}
          </h1>
          <Badge variant="outline">{t("placeholderTitle")}</Badge>
        </div>
        <p className="max-w-xl text-muted-foreground">{t("accountBody")}</p>
        {user ? (
          <p className="font-mono text-sm text-muted-foreground">
            {user.email}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
