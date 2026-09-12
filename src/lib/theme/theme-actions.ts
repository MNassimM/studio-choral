"use server";

import { cookies } from "next/headers";

import {
  THEME_COOKIE,
  THEME_MAX_AGE_SECONDS,
  parseThemePreference,
} from "@/lib/theme/theme-preference";

/**
 * Enregistre le thème choisi dans le menu du compte.
 *
 * @param formData - Données du formulaire, dont le champ theme porte la valeur
 * du bouton actionné.
 * @returns Rien.
 */
export async function rememberTheme(formData: FormData): Promise<void> {
  const theme = parseThemePreference(formData.get("theme")?.toString());
  if (!theme) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: THEME_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
