/**
 * Point de décision UNIQUE des règles commerciales du produit. Ces
 * constantes sont le seul endroit du projet où elles sont exprimées :
 * aucun composant, aucune route ne doit les réimplémenter ou les
 * contourner — tout passe par rules.ts, qui ne fait que LIRE ces valeurs.
 */
export const ACCESS_POLICY = {
  previewDurationSeconds: 30,

  // Posséder un pupitre d'un mouvement donne accès à l'ÉCOUTE du tutti de ce
  // mouvement : sans lui, le curseur Tutti ↔ Voix du Studio n'a aucun sens.
  ownedVoiceUnlocksTuttiStreaming: true,

  // Mais PAS à son téléchargement, réservé aux accès « toutes voix ».
  // Sinon un achat à 3,90 € livrerait le fichier complet et viderait de sa
  // valeur l'offre « toutes voix » à 11,90 €.
  //
  // DÉCISION COMMERCIALE À VALIDER — pas une évidence technique, un
  // arbitrage. Une valeur à basculer, rien d'autre : aucun code de
  // rules.ts ne doit se comporter différemment selon sa valeur actuelle
  // au-delà de la lire ici.
  ownedVoiceUnlocksTuttiDownload: false,

  // L'accompagnement instrumental seul n'a pas de valeur marchande
  // indépendante : il est inclus dès qu'un pupitre est possédé.
  ownedVoiceUnlocksAccompanimentStreaming: true,
  ownedVoiceUnlocksAccompanimentDownload: true,

  // Le Studio (tempo, mix) est réservé aux mouvements réellement débloqués.
  studioRequiresOwnership: true,
} as const;
