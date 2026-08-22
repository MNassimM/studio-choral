import type { WorkAccessInput } from "@/types/domain";

/**
 * Forme Prisma minimale nécessaire pour dériver un WorkAccessInput - pas les
 * types générés directement, pour rester découplé (même logique que
 * WorkCardData/WorkWithCardRelations dans work-card-data.ts).
 */
type RawAudioTrack = {
  voiceId: string | null;
};

type RawMovement = {
  id: string;
  audioFiles: RawAudioTrack[];
};

/**
 * Traduit les mouvements et pistes audio d'une Work en WorkAccessInput du
 * domaine (src/types/domain.ts) : les pupitres d'un mouvement sont déduits
 * de ses pistes (voiceCode non nul), jamais saisis à la main. C'est le seul
 * endroit du projet qui fait ce calcul - resolveWorkAccess() (lib/access)
 * ne fait que consommer son résultat.
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
