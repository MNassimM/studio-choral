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
 * La lecture de session a lieu ici, dans un composant serveur
 *
 * @param compact - Réduit le lien de connexion à un icone.
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
