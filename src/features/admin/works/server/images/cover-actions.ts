"use server";

import { requireAdmin } from "@/features/admin/works/server/authorization";
import {
  validateCover,
  type CoverCandidate,
} from "@/features/admin/works/server/images/cover-upload";
import { buildPendingKey, coverStorage } from "@/server/storage/storage";

/**
 * Action de téléversement d'une couverture, le pont entre le navigateur et le
 * bucket public.
 */

/** Ce que renvoie une demande d'URL d'écriture. */
export type CoverTicketResult =
  | {
      ok: true;
      /** À conserver dans le brouillon, il recompose la clé au moment voulu. */
      uploadId: string;
      url: string;
      expiresAt: Date;
    }
  | { ok: false; error: string };

/**
 * Signe un téléversement d'image vers le préfixe pending du bucket public.
 *
 * @remarks
 * Le fichier transite par `pending/` comme une piste audio, et ne rejoint sa
 * clé définitive qu'une fois l'oeuvre enregistrée — l'identifiant de l'oeuvre
 * n'existant pas encore à la création. Conséquence assumée : une image en
 * attente est lisible par qui connaîtrait son adresse, qui est tirée au sort
 * côté serveur. C'est une couverture que l'administrateur s'apprête à publier,
 * pas un fichier payant.
 *
 * @param candidate - Nom, type et taille annoncés par le navigateur.
 * @returns L'identifiant du téléversement et l'URL où envoyer le fichier.
 */
export async function requestCoverUpload(
  candidate: CoverCandidate,
): Promise<CoverTicketResult> {
  await requireAdmin();

  const verdict = validateCover(candidate);
  if (!verdict.ok) return { ok: false, error: verdict.error };

  const uploadId = crypto.randomUUID();
  const key = buildPendingKey(uploadId, candidate.filename);

  const signed = await coverStorage.signUpload({
    key,
    contentType: candidate.contentType,
    contentLength: candidate.sizeBytes,
  });

  if (!signed.ok) {
    // Le message du SDK peut recopier l'URL signée, on ne le relaie pas.
    console.error("cover-actions signUpload", signed.error);
    return { ok: false, error: "Le téléversement n'a pas pu être préparé." };
  }

  return {
    ok: true,
    uploadId,
    url: signed.url,
    expiresAt: signed.expiresAt,
  };
}
