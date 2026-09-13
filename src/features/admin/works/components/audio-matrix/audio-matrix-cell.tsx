"use client";

import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { memo, useId } from "react";

import { AudioDropZone } from "@/features/admin/works/components/audio-matrix/audio-drop-zone";
import {
  formatSize,
  type StoredTrackMeta,
  type Track,
  type UploadState,
} from "@/features/admin/works/components/audio-matrix/hooks/use-audio-upload";
import { Button } from "@/shared/components/ui/button";
import { trackCellKey } from "@/features/admin/works/domain/audio-upload";
import type { AudioType } from "@/domain/types";

/**
 * Une case de la matrice audio.
 */

/**
 * Une case, en cours d'envoi, remplie, ou en attente d'un fichier.
 *
 * @remarks
 * Mémoïsée, et c'est le but : pendant un téléversement l'état de progression
 * change plusieurs fois par seconde, ce qui redessinait auparavant toutes les
 * cases du tableau. Elle ne reçoit donc que des valeurs simples et des
 * rappels stables, jamais une fermeture fabriquée à la volée.
 *
 * @param movementKey - Clé du mouvement de la case.
 * @param voiceCode - Code du pupitre, nul pour un type commun.
 * @param type - Type de piste attendu.
 * @param name - Le nom parlé de la case, pour les lecteurs d'écran.
 * @param track - La piste posée sur cette case, s'il y en a une.
 * @param meta - Nom, taille et format des pistes déjà enregistrées.
 * @param upload - L'envoi en cours sur cette case, s'il y en a un.
 * @param uncertain - Vrai quand la déduction du nom n'était que probable.
 * @param onFile - Reçoit le fichier déposé, avec les coordonnées de la case.
 * @param onRemove - Retire la piste de la case.
 * @param onConfirm - Lève la marque à vérifier.
 * @returns La case rendue.
 */
export const AudioMatrixCell = memo(function AudioMatrixCell({
  movementKey,
  voiceCode,
  type,
  name,
  track,
  meta,
  upload,
  removing,
  uncertain,
  onFile,
  onRemove,
  onConfirm,
}: {
  movementKey: string;
  voiceCode: string | null;
  type: AudioType;
  name: string;
  track: Track | undefined;
  meta: StoredTrackMeta;
  upload: UploadState | undefined;
  /** Vrai pendant la suppression côté serveur. */
  removing: boolean;
  uncertain: boolean;
  onFile: (
    file: File,
    movementKey: string,
    voiceCode: string | null,
    type: AudioType,
  ) => void;
  onRemove: (track: Track) => void;
  onConfirm: (cellKey: string) => void;
}) {
  const inputId = useId();

  if (upload) {
    return upload.error ? (
      <div className="flex flex-col gap-1">
        <p className="flex items-start gap-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {upload.error}
        </p>
        <AudioDropZone
          id={inputId}
          label={`Réessayer, ${name}`}
          onFile={(file) => onFile(file, movementKey, voiceCode, type)}
          compact
        />
      </div>
    ) : (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Envoi {upload.progress} %
      </p>
    );
  }

  if (track) {
    // On capture l'etat dans une constante, TypeScript ne retrecit pas un
    // acces a une propriete a travers une variable booleenne.
    const state = track.state;
    const infos =
      state.kind === "pending"
        ? {
            filename: state.filename,
            sizeBytes: state.sizeBytes,
            mimeType: state.mimeType,
          }
        : meta[state.audioFileId];

    return (
      <div
        className={
          uncertain
            ? "flex items-center gap-1 rounded-lg border border-primary/60 bg-primary/5 p-1"
            : "flex items-center gap-1"
        }
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs" title={infos?.filename}>
            {infos?.filename ?? "Enregistrée"}
          </span>
          {uncertain ? (
            <button
              type="button"
              onClick={() =>
                onConfirm(trackCellKey(movementKey, voiceCode, type))
              }
              className="block cursor-pointer text-[0.625rem] font-medium text-primary underline"
            >
              À vérifier, cliquez pour valider
            </button>
          ) : null}
          <span className="block text-[0.625rem] text-muted-foreground">
            {infos
              ? [
                  infos.sizeBytes === null ? null : formatSize(infos.sizeBytes),
                  infos.filename?.split(".").findLast((s) => s) ?? null,
                  state.kind === "stored" ? "en base" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "déjà en base"}
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(track)}
          disabled={removing}
          aria-busy={removing}
          className="size-6 shrink-0 cursor-pointer rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {removing ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-3" aria-hidden="true" />
          )}
          <span className="sr-only">Retirer {name}</span>
        </Button>
      </div>
    );
  }

  return (
    <AudioDropZone
      id={inputId}
      label={`Déposer un fichier, ${name}`}
      onFile={(file) => onFile(file, movementKey, voiceCode, type)}
      compact
    />
  );
});
