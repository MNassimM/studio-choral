/**
 * Point de décision unique!! des règles commerciales du produit.
 *
 * Basculer une valeur ici change le comportement de tout le produit d'un
 * coup, ce qui est exactement l'intérêt de les avoir centralisées.
 */
export const ACCESS_POLICY = {
  /** Durée de l'extrait gratuit, écoutable sans aucun achat. */
  previewDurationSeconds: 30,

  ownedVoiceUnlocksTuttiStreaming: true,
  ownedVoiceUnlocksTuttiDownload: false,
  ownedVoiceUnlocksAccompanimentStreaming: true,
  ownedVoiceUnlocksAccompanimentDownload: true,

  /** Le Studio (tempo, mix) est réservé aux mouvements réellement débloqués. */
  studioRequiresOwnership: true,

  ownedVoiceUnlocksSoloDownload: false,
} as const;
