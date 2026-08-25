import type { WorkAccessInput } from "@/types/domain";

/**
 * Forme minimale d'une piste audio nécessaire au calcul des pupitres.
 *
 * @remarks
 * Volontairement pas le type Prisma généré, pour rester découplé. Même
 * logique que WorkCardData et WorkWithCardRelations dans work-card-data.ts.
 */
type RawAudioTrack = {
  voiceId: string | null;
};

/**
 * Forme minimale d'un mouvement nécessaire au calcul des pupitres.
 */
type RawMovement = {
  id: string;
  audioFiles: RawAudioTrack[];
};

/**
 * Traduit les mouvements et pistes audio d'une œuvre en WorkAccessInput.
 *
 * @remarks
 * Les pupitres d'un mouvement sont DÉDUITS de ses pistes, jamais saisis à la
 * main : une piste sans voiceId (tutti, accompagnement, extrait) ne
 * correspond à aucun pupitre et est donc ignorée.
 *
 * C'est le seul endroit du projet qui fait ce calcul. resolveWorkAccess() se
 * contente ensuite de consommer son résultat.
 *
 * @param workId - Identifiant de l'œuvre.
 * @param movements - Mouvements de l'œuvre, avec leurs pistes audio.
 * @param voiceCodeById - Correspondance identifiant de voix vers code SATB.
 * @returns L'œuvre en forme domaine, prête pour resolveWorkAccess().
 */
export function buildWorkAccessInput(
  workId: string,
  movements: RawMovement[],
  voiceCodeById: Map<string, string>,
): WorkAccessInput {
  return {
    id: workId,
    movements: movements.map((movement) => {
      const voiceCodes = new Set<string>();
      for (const track of movement.audioFiles) {
        if (!track.voiceId) continue;
        const code = voiceCodeById.get(track.voiceId);
        if (code) voiceCodes.add(code);
      }
      return { id: movement.id, voiceCodes: Array.from(voiceCodes) };
    }),
  };
}
