/**
 * Traduction des informations publiées par Google en utilisateur du site.
 * SERV ONLY !!
 */

/**
 * Forme des informations renvoyées par Google, limitée à ce que le site lit.
 */
export type GoogleProfile = {
  sub: string;
  name?: string | null;
  email: string;
  picture?: string | null;
};

/**
 * Traduit un profil Google en utilisateur du site.
 *
 * @param profile - Informations telles que Google les publie.
 * @returns L'utilisateur, adresse normalisée.
 */
export function mapGoogleProfile(profile: GoogleProfile) {
  return {
    id: profile.sub,
    name: profile.name ?? null,
    email: profile.email.toLowerCase().trim(),
    image: profile.picture ?? null,
  };
}

/**
 * Détermine le nom à enregistrer pour un compte qui n'en a pas encore.
 *
 * @param storedName - Nom actuellement en base pour ce compte.
 * @param googleName - Nom tel que Google le publie.
 * @returns Le nom à écrire, ou null s'il n'y a rien à faire.
 */
export function resolveNameToStore(
  storedName: string | null | undefined,
  googleName: string | null | undefined,
): string | null {
  if (storedName && storedName.trim()) {
    return null;
  }

  const candidate = googleName?.trim();
  return candidate ? candidate : null;
}
