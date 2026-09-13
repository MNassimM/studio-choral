import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { UserRound } from "lucide-react";

import { AccountMenu } from "@/features/auth/components/account-menu";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/features/auth/server/current-user";
import { cn } from "@/shared/utils/cn";
import { isAdmin } from "@/features/admin/works/server/authorization";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  parseThemePreference,
} from "@/shared/theme/theme-preference";

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
    // Le réglage du thème vit dans ce menu, il n'est donc proposé qu'aux
    // personnes connectées. Le cookie, lui, vaut pour tout le monde.
    const cookieStore = await cookies();
    const theme =
      parseThemePreference(cookieStore.get(THEME_COOKIE)?.value) ??
      DEFAULT_THEME;

    return (
      <AccountMenu
        name={user.name || user.email}
        admin={isAdmin(user)}
        theme={theme}
      />
    );
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
