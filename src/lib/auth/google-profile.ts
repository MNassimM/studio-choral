/**
 * Traduction des informations publiées par Google en utilisateur du site.
 *
 * @remarks
 * Module pur, sans directive server-only et sans import de Next ou de Prisma,
 * pour rester vérifiable seul, sans identifiants OAuth ni aller retour vers
 * Google. Il ne manipule aucun secret, seulement les informations publiques
 * d'un profil déjà authentifié.
 */

/**
 * Forme des informations renvoyées par Google, limitée à ce que le site lit.
 *
 * @remarks
 * Google publie davantage de champs, mais en déclarer plus que nécessaire
 * laisserait croire qu'ils sont utilisés quelque part.
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
 * @remarks
 * L'adresse est ramenée en minuscules. Auth.js recherche un compte existant
 * par égalité stricte sur l'adresse, et le lien magique enregistre déjà la
 * sienne en minuscules. Sans cette normalisation, une adresse renvoyée avec
 * une majuscule ne retrouverait aucun compte et en créerait un second,
 * silencieusement, laissant l'utilisateur devant une bibliothèque vide alors
 * que ses achats existent toujours sur l'autre compte.
 *
 * Le sous adressage est conservé, une adresse ainsi formée étant un choix
 * délibéré de l'utilisateur. Même règle que la normalisation du lien magique,
 * pour que les deux chemins désignent exactement le même compte.
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
