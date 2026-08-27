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

/**
 * Détermine le nom à enregistrer pour un compte qui n'en a pas encore.
 *
 * @remarks
 * Cette fonction existe parce qu'Auth.js n'écrit le nom publié par Google qu'au
 * moment où il CRÉE l'utilisateur. Quelqu'un dont le compte a été ouvert par
 * lien magique n'a pas de nom, et se connecter ensuite par Google ne lui en
 * donne pas : Auth.js se contente de rattacher la connexion au compte existant.
 * Le même constat vaut pour les connexions Google suivantes, qui ne repassent
 * jamais par la création.
 *
 * Un nom déjà enregistré n'est jamais remplacé. Le seul but est de combler une
 * absence, pas de suivre les changements d'état civil chez Google. Écraser
 * reviendrait à défaire, à chaque connexion, un nom que l'utilisateur pourrait
 * un jour choisir lui même.
 *
 * Un nom réduit à des espaces est traité comme absent, des deux côtés : le
 * stocker afficherait un menu de compte vide, et le lire comme une valeur
 * présente empêcherait la prochaine occasion de le combler.
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
