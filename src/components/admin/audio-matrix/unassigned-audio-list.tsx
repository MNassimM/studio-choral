"use client";

import {
  formatSize,
  type UploadedFile,
} from "@/components/admin/audio-matrix/hooks/use-audio-upload";
import type { WorkFormDraft } from "@/lib/admin/work-form-draft";
import type { AudioType } from "@/types/domain";

/**
 * Les fichiers envoyés que la déduction n'a pas su placer.
 */

/** Un fichier en attente de classement, avec le motif du refus. */
export type UnassignedFile = UploadedFile & {
  /** Pourquoi la déduction n'a pas su le placer. */
  reason?: string;
};

/** Une case libre proposée dans la liste déroulante. */
export type FreeCell = { voiceCode: string | null; type: AudioType };

/**
 * La liste des fichiers non associés, chacun avec sa case à choisir.
 *
 * @param items - Les fichiers restés à classer.
 * @param movements - Les mouvements de l'oeuvre, dans l'ordre.
 * @param freeCellsOf - Rend les cases encore libres d'un mouvement.
 * @param cellLabel - Rend le libellé d'une case.
 * @param onAssign - Place un fichier dans la case choisie.
 * @returns La liste rendue, ou rien s'il n'y a aucun fichier à classer.
 */
export function UnassignedAudioList({
  items,
  movements,
  freeCellsOf,
  cellLabel,
  onAssign,
}: {
  items: UnassignedFile[];
  movements: WorkFormDraft["movements"];
  freeCellsOf: (movementKey: string) => FreeCell[];
  cellLabel: (cell: FreeCell) => string;
  onAssign: (item: UnassignedFile, target: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2 rounded-xl border border-border p-3">
      {items.map((item) => (
        <li
          key={item.uploadId}
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate">
              {item.filename}{" "}
              <span className="text-xs text-muted-foreground">
                {formatSize(item.sizeBytes)}
              </span>
            </span>
            {item.reason ? (
              <span className="block text-xs text-muted-foreground">
                {item.reason}
              </span>
            ) : null}
          </span>
          <label className="flex items-center gap-2 text-xs">
            <span className="sr-only">Placer {item.filename}</span>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) onAssign(item, event.target.value);
              }}
            >
              <option value="">Placer dans une case...</option>
              {movements.map((movement) => (
                <optgroup key={movement.key} label={movement.title}>
                  {freeCellsOf(movement.key).map((cellule) => (
                    <option
                      key={`${cellule.voiceCode}-${cellule.type}`}
                      value={`${movement.key} ${cellule.voiceCode ?? ""} ${cellule.type}`}
                    >
                      {cellLabel(cellule)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </li>
      ))}
    </ul>
  );
}
