"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { Loader2, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Bouton de déconnexion pleine largeur.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @param onSignOutStart - Appelé dès le clic, avant la redirection, pour que le
 * conteneur puisse se refermer sans attendre la fin de l'opération.
 * @returns Le bouton rendu.
 */
function SignOutButton({
  className,
  onSignOutStart,
}: {
  className?: string;
  onSignOutStart?: () => void;
}) {
  const t = useTranslations("auth.account");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleClick() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    onSignOutStart?.();
    await signOut({ redirectTo: "/" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSigningOut}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-destructive/20 focus-visible:outline-none disabled:opacity-50",
        className,
      )}
    >
      {isSigningOut ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {isSigningOut ? t("signingOut") : t("signOut")}
    </button>
  );
}

export { SignOutButton };
