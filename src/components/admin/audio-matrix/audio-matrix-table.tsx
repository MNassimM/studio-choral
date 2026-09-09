"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AudioMatrixCell } from "@/components/admin/audio-matrix/audio-matrix-cell";
import type {
  StoredTrackMeta,
  Track,
  UploadState,
} from "@/components/admin/audio-matrix/hooks/use-audio-upload";
import { PER_VOICE_TYPES, trackCellKey } from "@/lib/admin/audio-upload";
import type { VoiceOption } from "@/lib/admin/voice-options";
import type { WorkFormDraft } from "@/lib/admin/work-form-draft";
import type { AudioType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Le tableau d'import : une ligne par piste attendue, une colonne par mouvement.
 */

type Movement = WorkFormDraft["movements"][number];

/**
 * Un groupe de lignes pour un pupitre, replié quand il est vide.
 *
 * @param label - Le libellé du pupitre.
 * @param posees - Nombre de cases déjà remplies.
 * @param total - Nombre de cases attendues.
 * @param ouvert - Vrai quand le groupe est déplié.
 * @param repliable - Vrai quand le groupe peut se replier, donc quand il est vide.
 * @param colonnes - Nombre de colonnes du tableau, pour la fusion de cellules.
 * @param onToggle - Bascule l'ouverture du groupe.
 * @param children - Les lignes du groupe.
 * @returns Les lignes rendues.
 */
function VoiceGroup({
  label,
  posees,
  total,
  ouvert,
  repliable,
  colonnes,
  onToggle,
  children,
}: {
  label: string;
  posees: number;
  total: number;
  ouvert: boolean;
  repliable: boolean;
  colonnes: number;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="bg-secondary/40">
        <th
          scope="colgroup"
          colSpan={colonnes}
          className="sticky left-0 px-3 py-1.5 text-left text-xs font-medium"
        >
          {repliable ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={ouvert}
              className="flex cursor-pointer items-center gap-1.5"
            >
              {ouvert ? (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden="true" />
              )}
              {label}
              <span className="font-normal text-muted-foreground">
                aucune piste, {total} cases attendues
              </span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5">
              {label}
              <span className="font-normal text-muted-foreground tabular-nums">
                {posees} sur {total}
              </span>
            </span>
          )}
        </th>
      </tr>
      {ouvert ? children : null}
    </>
  );
}

/**
 * Une ligne de la matrice, un intitulé puis une case par mouvement.
 *
 * @param label - L'intitulé de la ligne.
 * @param movements - Les mouvements de l'oeuvre, dans l'ordre.
 * @param plusieurs - Vrai quand l'oeuvre compte plusieurs mouvements.
 * @param render - Rend la case d'un mouvement.
 * @returns La ligne rendue.
 */
function MatrixRow({
  label,
  movements,
  plusieurs,
  render,
}: {
  label: string;
  movements: Movement[];
  plusieurs: boolean;
  render: (movement: Movement) => React.ReactNode;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="sticky left-0 z-10 min-w-48 bg-card px-3 py-2 text-left font-normal"
      >
        {label}
      </th>
      {movements.map((movement) => (
        <td
          key={movement.key}
          className={cn("px-3 py-2", plusieurs && "min-w-44")}
        >
          {render(movement)}
        </td>
      ))}
    </tr>
  );
}

/**
 * Le tableau complet, pupitre par pupitre puis types communs.
 *
 * @param movements - Les mouvements de l'oeuvre, dans l'ordre.
 * @param voices - Les pupitres retenus par l'oeuvre.
 * @param commonTypes - Les types sans pupitre, accompagnement compris si déclaré.
 * @param storedMeta - Nom, taille et format des pistes déjà enregistrées.
 * @param uploads - Les envois en cours, par clé de case.
 * @param uncertainCells - Les cases placées par déduction approchée.
 * @param typeLabel - Rend le libellé d'un type de piste.
 * @param trackAt - Rend la piste posée sur une case.
 * @param onFile - Reçoit le fichier déposé sur une case.
 * @param onRemove - Retire une piste.
 * @param onConfirm - Lève la marque à vérifier d'une case.
 * @returns Le tableau rendu.
 */
export function AudioMatrixTable({
  movements,
  voices,
  commonTypes,
  storedMeta,
  uploads,
  uncertainCells,
  typeLabel,
  trackAt,
  onFile,
  onRemove,
  onConfirm,
}: {
  movements: Movement[];
  voices: VoiceOption[];
  commonTypes: AudioType[];
  storedMeta: StoredTrackMeta;
  uploads: Record<string, UploadState>;
  uncertainCells: string[];
  typeLabel: (type: AudioType) => string;
  trackAt: (
    movementKey: string,
    voiceCode: string | null,
    type: AudioType,
  ) => Track | undefined;
  onFile: (
    file: File,
    movementKey: string,
    voiceCode: string | null,
    type: AudioType,
  ) => void;
  onRemove: (track: Track) => void;
  onConfirm: (cellKey: string) => void;
}) {
  // Repli purement visuel, il n'a aucun sens hors de ce tableau.
  const [deployes, setDeployes] = useState<string[]>([]);

  const plusieurs = movements.length > 1;

  /** Rend une case, quelles que soient ses coordonnées. */
  function cell(
    movement: Movement,
    voiceCode: string | null,
    type: AudioType,
    name: string,
  ) {
    const cellKey = trackCellKey(movement.key, voiceCode, type);
    return (
      <AudioMatrixCell
        movementKey={movement.key}
        voiceCode={voiceCode}
        type={type}
        name={name}
        track={trackAt(movement.key, voiceCode, type)}
        meta={storedMeta}
        upload={uploads[cellKey]}
        uncertain={uncertainCells.includes(cellKey)}
        onFile={onFile}
        onRemove={onRemove}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        {plusieurs ? (
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Piste
              </th>
              {movements.map((movement) => (
                <th
                  key={movement.key}
                  scope="col"
                  className="min-w-44 px-3 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {movement.title || "Sans titre"}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}

        <tbody className="divide-y divide-border">
          {voices.map((voice) => {
            const cellesDuPupitre = movements.flatMap((movement) =>
              PER_VOICE_TYPES.map((type) =>
                trackAt(movement.key, voice.code, type),
              ),
            );
            const posees = cellesDuPupitre.filter(Boolean).length;
            const vide = posees === 0;

            return (
              <VoiceGroup
                key={voice.code}
                label={voice.label}
                posees={posees}
                total={cellesDuPupitre.length}
                ouvert={!vide || deployes.includes(voice.code)}
                repliable={vide}
                colonnes={movements.length + 1}
                onToggle={() =>
                  setDeployes((liste) =>
                    liste.includes(voice.code)
                      ? liste.filter((code) => code !== voice.code)
                      : [...liste, voice.code],
                  )
                }
              >
                {PER_VOICE_TYPES.map((type) => (
                  <MatrixRow
                    key={type}
                    label={`${voice.label} · ${typeLabel(type)}`}
                    movements={movements}
                    plusieurs={plusieurs}
                    render={(movement) =>
                      cell(
                        movement,
                        voice.code,
                        type,
                        `${voice.label}, ${typeLabel(type)}, ${movement.title || "sans titre"}`,
                      )
                    }
                  />
                ))}
              </VoiceGroup>
            );
          })}

          <tr className="bg-secondary/40">
            <th
              scope="colgroup"
              colSpan={movements.length + 1}
              className="sticky left-0 px-3 py-1.5 text-left text-xs font-medium"
            >
              Commun au mouvement
            </th>
          </tr>
          {commonTypes.map((type) => (
            <MatrixRow
              key={type}
              label={typeLabel(type)}
              movements={movements}
              plusieurs={plusieurs}
              render={(movement) =>
                cell(
                  movement,
                  null,
                  type,
                  `${typeLabel(type)}, ${movement.title || "sans titre"}`,
                )
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
