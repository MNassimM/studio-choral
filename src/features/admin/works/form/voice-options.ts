import frWork from "../../../../../messages/fr/work.json";

import { prisma } from "@/server/db/prisma";
import { isKnownVoiceCode } from "@/features/work/domain/voice-label";

/**
 * Les pupitres proposables par le formulaire d'oeuvre.
 */

/** Un pupitre, avec son libellé déjà résolu. */
export type VoiceOption = { code: string; label: string };

/**
 * Charge les pupitres de la base, dans leur ordre canonique.
 *
 * @remarks
 * Le tri porte aussi sur le code parce que position n'est pas unique, Soprano
 * et Soprano 1 partagent la même. Le libellé suit la règle du site, traduction
 * si le code est connu, sinon le libellé de la table.
 *
 * @returns Les pupitres triés, prêts à descendre dans le formulaire.
 */
export async function loadVoiceOptions(): Promise<VoiceOption[]> {
  const voices = await prisma.voice.findMany({
    orderBy: [{ position: "asc" }, { code: "asc" }],
    select: { code: true, label: true },
  });

  return voices.map((voice) => ({
    code: voice.code,
    label: isKnownVoiceCode(voice.code)
      ? frWork.voice[voice.code]
      : voice.label,
  }));
}
