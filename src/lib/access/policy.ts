/**
 * Point de décision unique des règles commerciales du produit.
 *
 * @remarks
 * Ces constantes sont le seul endroit du projet où ces règles sont exprimées.
 * Aucun composant, aucune route ne doit les réimplémenter ou les contourner.
 * Tout passe par rules.ts, qui se contente de LIRE ces valeurs sans jamais
 * se comporter différemment selon ce qu'elles valent.
 *
 * Basculer une valeur ici change le comportement de tout le produit d'un
 * coup, ce qui est exactement l'intérêt de les avoir centralisées.
 */
export const ACCESS_POLICY = {
  /** Durée de l'extrait gratuit, écoutable sans aucun achat. */
  previewDurationSeconds: 30,

  /**
   * Posséder un pupitre d'un mouvement donne accès à l'ÉCOUTE du tutti de ce
   * mouvement. Sans ça, le curseur Tutti vers Voix du Studio n'aurait aucun
   * sens : on ne pourrait comparer sa voix à rien.
   */
  ownedVoiceUnlocksTuttiStreaming: true,

  /**
   * Mais PAS à son téléchargement, réservé aux accès toutes voix.
   *
   * @remarks
   * Sinon un achat à 3,90 € livrerait le fichier complet et viderait de sa
   * valeur l'offre toutes voix à 11,90 €.
   *
   * Décision commerciale à valider, pas une évidence technique. C'est un
   * arbitrage, et rien d'autre qu'une valeur à basculer si l'arbitrage
   * change.
   */
  ownedVoiceUnlocksTuttiDownload: false,

  /**
   * L'accompagnement instrumental seul n'a pas de valeur marchande
   * indépendante, il est donc inclus dès qu'un pupitre est possédé.
   */
  ownedVoiceUnlocksAccompanimentStreaming: true,
  ownedVoiceUnlocksAccompanimentDownload: true,

  /** Le Studio (tempo, mix) est réservé aux mouvements réellement débloqués. */
  studioRequiresOwnership: true,

  /**
   * La voix seule s'écoute mais ne se télécharge pas. Même logique que le
   * tutti : c'est le fichier isolé qui a de la valeur à l'achat.
   */
  ownedVoiceUnlocksSoloDownload: false,
} as const;
