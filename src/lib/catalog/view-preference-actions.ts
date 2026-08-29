"use server";

import { cookies } from "next/headers";

import {
  CATALOG_VIEW_COOKIE,
  CATALOG_VIEW_MAX_AGE_SECONDS,
  parseCatalogView,
} from "@/lib/catalog/view-preference";

/**
 * Enregistre le mode d'affichage soumis par la switch button.
 * 
 * @param formData - Données du formulaire, dont le champ view porte le mode
 * correspondant au bouton actionné.
 * @returns Rien.
 */
export async function rememberCatalogView(formData: FormData): Promise<void> {
  const view = parseCatalogView(formData.get("view")?.toString());
  if (!view) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(CATALOG_VIEW_COOKIE, view, {
    path: "/",
    maxAge: CATALOG_VIEW_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
