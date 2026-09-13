/**
 * L'envoi d'un fichier vers une URL signée, avec progression.
 *
 * @remarks
 * Partagé par la matrice audio et par l'image de couverture : les deux
 * envoient directement au stockage, sans passer par Next. XHR et non fetch,
 * parce que seul XHR rapporte la progression d'un téléversement.
 */

/**
 * Ce qu'a donné un envoi.
 *
 * @remarks
 * Le statut distingue deux mondes : `null` signifie que la requête n'a jamais
 * abouti — le navigateur l'a bloquée, ou le réseau a lâché — tandis qu'un
 * nombre vient bien du stockage, qui a répondu et refusé. Sans cette
 * distinction, une règle CORS absente et un jeton mal porté envoient le même
 * message, et le diagnostic prend une heure.
 */
export type UploadOutcome = { ok: true } | { ok: false; status: number | null };

/**
 * Envoie un fichier en PUT sur une URL signée.
 *
 * @param url - URL signée, qui fige déjà le type et la taille attendus.
 * @param file - Fichier à envoyer.
 * @param onProgress - Reçoit l'avancement, en pourcentage entier.
 * @returns Le succès, ou le statut du refus quand il y en a un.
 */
export function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadOutcome> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      resolve(
        xhr.status >= 200 && xhr.status < 300
          ? { ok: true }
          : { ok: false, status: xhr.status },
      );
    // Une erreur XHR ne porte aucun statut : le navigateur refuse de laisser
    // lire une réponse qui n'a pas passé le contrôle d'origine.
    xhr.onerror = () => resolve({ ok: false, status: null });
    xhr.send(file);
  });
}

/**
 * Traduit un échec d'envoi en message qui oriente vers la cause.
 *
 * @param status - Statut rendu par le stockage, ou null si aucune réponse.
 * @returns Un message destiné à l'administrateur.
 */
export function describeUploadFailure(status: number | null): string {
  if (status === null) {
    return "Le stockage n'a pas répondu : requête bloquée par le navigateur, ou réseau coupé. La cause la plus fréquente est une règle CORS absente sur le bucket.";
  }
  if (status === 403) {
    return "Le stockage a refusé l'envoi (403) : le jeton d'API ne couvre probablement pas ce bucket, ou la signature a expiré.";
  }
  if (status === 404) {
    return "Bucket introuvable (404) : vérifiez le nom du bucket dans la configuration.";
  }
  return `Le stockage a refusé l'envoi (${status}).`;
}
