import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";

import { AccountMenu } from "@/components/auth/account-menu";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";

/**
 * Emplacement compte de l'en tête, dont le contenu dépend de la session.
 *
 * @remarks
 * La lecture de session a lieu ici, dans un composant serveur, et seul le
 * menu d'un utilisateur connecté descend côté client. C'est ce qui évite
 * d'ajouter un fournisseur de session au gabarit racine pour un besoin aussi
 * limité.
 *
 * Un visiteur reçoit un lien direct vers la connexion plutôt qu'un menu, un
 * menu à une seule entrée n'étant qu'un clic supplémentaire pour rien.
 *
 * @param compact - Réduit le lien de connexion à sa seule icône, pour les
 * largeurs où le libellé ne tient pas.
 * @returns L'emplacement rendu.
 */
async function AccountSlot({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations("auth.account");
  const user = await getCurrentUser();

  if (user) {
    return <AccountMenu name={user.name || user.email} email={user.email} />;
  }

  return (
    <Link
      href="/connexion"
      aria-label={compact ? t("signIn") : undefined}
      className={cn(
        buttonVariants({ variant: "outline", size: compact ? "icon" : "sm" }),
        "gap-1.5 rounded-full",
      )}
    >
      <UserRound className="size-4" aria-hidden="true" />
      {compact ? null : t("signIn")}
    </Link>
  );
}

export { AccountSlot };
