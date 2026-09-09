"use client";

import { useCallback, useState } from "react";

import type { UploadedFile } from "@/components/admin/audio-matrix/hooks/use-audio-upload";
import { trackCellKey } from "@/lib/admin/audio-upload";
import {
  deduceFilenames,
  type DeductionMovement,
  type DeductionVoice,
} from "@/lib/admin/filename-deduction";
import type { AudioType } from "@/types/domain";

/**
 * Le dépôt multiple : déduction du placement, envois, récapitulatif.
 */

/** Ce dont le dépôt multiple a besoin pour travailler. */
export type BatchAudioDropParams = {
  movements: DeductionMovement[];
  /** Pupitres retenus par l'oeuvre. */
  voices: DeductionVoice[];
  hasAccompaniment: boolean;
  /** Les cases déjà prises, relues au moment du dépôt. */
  readOccupiedCells: () => string[];
  /** Envoie un fichier, depuis le crochet de téléversement. */
  upload: (file: File, cellKey: string) => Promise<UploadedFile | null>;
  /** Pose un fichier envoyé dans une case du brouillon. */
  placeTrack: (
    movementKey: string,
    voiceCode: string | null,
    type: AudioType,
    uploaded: UploadedFile,
  ) => void;
  /** Range un fichier que rien ne permet de placer. */
  pushUnassigned: (uploaded: UploadedFile, reason: string) => void;
  /** Annonce un message aux lecteurs d'écran. */
  announce: (message: string) => void;
};

/** Ce que le crochet de dépôt multiple rend à la section. */
export type BatchAudioDrop = {
  /** Le compte rendu du dernier dépôt, ou null. */
  recap: string | null;
  /** Les cases placées par une déduction seulement probable. */
  uncertainCells: string[];
  /** Traite un lot de fichiers déposés. */
  dropFiles: (files: FileList) => Promise<void>;
  /** Lève la marque à vérifier d'une case. */
  confirmCell: (cellKey: string) => void;
};

/**
 * Range un lot de fichiers déposés, d'après leur nom.
 *
 * @param params - Contexte de l'oeuvre et actions de la section.
 * @returns Le récapitulatif, les cases douteuses et le traitement d'un lot.
 */
export function useBatchAudioDrop(
  params: BatchAudioDropParams,
): BatchAudioDrop {
  const [recap, setRecap] = useState<string | null>(null);
  // Marque d'affichage seulement, tenue hors du brouillon : une fois la piste
  // enregistrée, c'est une piste comme une autre.
  const [uncertainCells, setUncertainCells] = useState<string[]>([]);

  // Référence stable : elle descend jusqu'aux cases, qui sont mémoïsées.
  const confirmCell = useCallback((cellKey: string) => {
    setUncertainCells((cles) => cles.filter((autre) => autre !== cellKey));
  }, []);

  /**
   * Déduit le placement de chaque fichier, puis les envoie dans cet ordre.
   *
   * @param files - Les fichiers déposés sur la zone globale.
   * @returns Rien.
   */
  async function dropFiles(files: FileList) {
    setRecap(null);

    const liste = Array.from(files);
    const lot = deduceFilenames(
      liste.map((file) => file.name),
      {
        movements: params.movements,
        voices: params.voices,
        hasAccompaniment: params.hasAccompaniment,
        occupied: params.readOccupiedCells(),
      },
    );

    const parNom = new Map(liste.map((file) => [file.name, file]));
    let places = 0;
    let aVerifier = 0;
    let restants = 0;

    for (const placement of lot.placed) {
      const file = parNom.get(placement.filename);
      if (!file) continue;
      const cellKey = trackCellKey(
        placement.movementKey,
        placement.voiceCode,
        placement.type,
      );
      const envoye = await params.upload(file, cellKey);
      if (!envoye) continue;
      params.placeTrack(
        placement.movementKey,
        placement.voiceCode,
        placement.type,
        envoye,
      );
      places += 1;
      if (placement.confidence === "probable") {
        aVerifier += 1;
        setUncertainCells((cles) =>
          cles.includes(cellKey) ? cles : [...cles, cellKey],
        );
      }
    }

    for (const refus of lot.rejected) {
      const file = parNom.get(refus.filename);
      if (!file) continue;
      const envoye = await params.upload(file, `global-${refus.filename}`);
      if (!envoye) continue;
      params.pushUnassigned(envoye, refus.reason);
      restants += 1;
    }

    const phrase = [
      `${places} fichier${places > 1 ? "s" : ""} placé${places > 1 ? "s" : ""}`,
      `${aVerifier} à vérifier`,
      `${restants} à classer à la main`,
    ].join(", ");
    setRecap(phrase);
    params.announce(phrase);
  }

  return { recap, uncertainCells, dropFiles, confirmCell };
}
