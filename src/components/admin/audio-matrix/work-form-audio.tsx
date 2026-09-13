"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";

import { AudioDropZone } from "@/components/admin/audio-matrix/audio-drop-zone";
import { AudioMatrixTable } from "@/components/admin/audio-matrix/audio-matrix-table";
import { AudioNamingGuide } from "@/components/admin/audio-matrix/audio-naming-guide";
import {
  useAudioUpload,
  type StoredTrackMeta,
  type Track,
  type UploadedFile,
} from "@/components/admin/audio-matrix/hooks/use-audio-upload";
import { useBatchAudioDrop } from "@/components/admin/audio-matrix/hooks/use-batch-audio-drop";
import {
  UnassignedAudioList,
  type FreeCell,
  type UnassignedFile,
} from "@/components/admin/audio-matrix/unassigned-audio-list";
import { Section, useWorkForm } from "@/components/admin/work-form-fields";
import { removeAudioTrack } from "@/lib/admin/audio/audio-actions";
import { PER_VOICE_TYPES, trackCellKey } from "@/lib/admin/audio/audio-upload";
import { normalize as normalizeName } from "@/lib/admin/audio/filename-deduction";
import type { VoiceOption } from "@/lib/admin/form/voice-options";
import type { AudioType } from "@/types/domain";

/**
 * La section d'import audio : elle tient l'état et assemble les morceaux.
 */

export type { StoredTrackMeta };

/** Les types communs à tout le mouvement, sans pupitre. */
const COMMON_TYPES: AudioType[] = ["TUTTI", "ACCOMPANIMENT"];

/** Libellés français des types de piste. */
const TYPE_LABELS: Record<AudioType, string> = {
  SOLO: "Voix seule",
  PREDOMINANT: "Voix prédominante",
  PREVIEW: "Aperçu gratuit",
  TUTTI: "Tutti",
  ACCOMPANIMENT: "Accompagnement",
};

/**
 * La matrice d'import des pistes audio.
 *
 * @param voices - Les pupitres de la base, pour les libellés.
 * @param storedMeta - Nom, taille et format des pistes déjà enregistrées.
 * @param onBusyChange - Prévient le parent qu'un envoi est en cours, pour
 * qu'il empêche l'enregistrement tant que ce n'est pas fini.
 * @returns La section rendue.
 */
export function WorkAudioSection({
  voices,
  storedMeta = {},
  onBusyChange,
}: {
  voices: VoiceOption[];
  storedMeta?: StoredTrackMeta;
  onBusyChange: (busy: boolean) => void;
}) {
  const form = useWorkForm();
  const control = form.control;

  const movements = useWatch({ control, name: "movements" }) ?? [];
  const voiceCodes = useWatch({ control, name: "voiceCodes" }) ?? [];
  const hasAccompaniment = useWatch({ control, name: "hasAccompaniment" });
  const watchedTracks = useWatch({ control, name: "tracks" });
  // Le repli sur un tableau vide fabriquerait une référence neuve à chaque
  // rendu, ce qui ferait changer les rappels descendus aux cases mémoïsées et
  // annulerait tout le bénéfice de la mémoïsation.
  const tracks = useMemo(
    () => (watchedTracks ?? []) as Track[],
    [watchedTracks],
  );

  const { uploads, busy, announcement, announce, upload } = useAudioUpload();

  const [unassigned, setUnassigned] = useState<UnassignedFile[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const globalInputId = useId();

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const plusieurs = movements.length > 1;
  const commonTypes = COMMON_TYPES.filter(
    (type) => type !== "ACCOMPANIMENT" || hasAccompaniment,
  );
  const retenus = voices.filter((voice) => voiceCodes.includes(voice.code));

  /** Remplace la case visée dans le brouillon. */
  const placeTrack = useCallback(
    (
      movementKey: string,
      voiceCode: string | null,
      type: AudioType,
      uploaded: UploadedFile,
    ) => {
      // On relit la valeur vive du formulaire, pas celle de la passe de rendu :
      // un dépôt multiple écrit plusieurs pistes dans la même fermeture, et une
      // liste figée ferait écraser chaque piste par la suivante.
      const autres = (form.getValues("tracks") as Track[]).filter(
        (track) =>
          !(
            track.movementKey === movementKey &&
            track.voiceCode === voiceCode &&
            track.type === type
          ),
      );
      form.setValue(
        "tracks",
        [
          ...autres,
          {
            movementKey,
            voiceCode,
            type,
            state: { kind: "pending" as const, ...uploaded },
          },
        ],
        { shouldValidate: true, shouldDirty: true },
      );
    },
    [form],
  );

  /** Envoie un fichier directement dans une case. */
  const uploadInto = useCallback(
    async (
      file: File,
      movementKey: string,
      voiceCode: string | null,
      type: AudioType,
    ) => {
      const envoye = await upload(
        file,
        trackCellKey(movementKey, voiceCode, type),
      );
      if (envoye) placeTrack(movementKey, voiceCode, type, envoye);
    },
    [upload, placeTrack],
  );

  // Cases dont la suppression est en cours côté serveur.
  const [removingKeys, setRemovingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  /** Retire une piste, en supprimant l'objet si elle est déjà en base. */
  const remove = useCallback(
    async (track: Track) => {
      if (track.state.kind === "stored") {
        const cellKey = trackCellKey(
          track.movementKey,
          track.voiceCode,
          track.type,
        );
        const confirme = window.confirm(
          "Cette piste est déjà enregistrée. La retirer supprimera définitivement le fichier audio. Continuer ?",
        );
        if (!confirme) return;
        setRemovingKeys((current) => new Set(current).add(cellKey));
        const retrait = await removeAudioTrack(track.state.audioFileId).finally(
          () =>
            setRemovingKeys((current) => {
              const next = new Set(current);
              next.delete(cellKey);
              return next;
            }),
        );
        if (!retrait.ok) {
          setGlobalError(retrait.error);
          return;
        }
        if (!retrait.objectDeleted) {
          setGlobalError(
            "La piste est retirée, mais le fichier n'a pas pu être supprimé du stockage.",
          );
        }
      }
      form.setValue(
        "tracks",
        tracks.filter((autre) => autre !== track),
        { shouldValidate: true, shouldDirty: true },
      );
      announce("Piste retirée.");
    },
    [form, tracks, announce],
  );

  const { recap, uncertainCells, dropFiles, confirmCell } = useBatchAudioDrop({
    movements: movements.map((movement) => ({
      key: movement.key,
      title: movement.title,
    })),
    voices: retenus,
    hasAccompaniment: Boolean(hasAccompaniment),
    readOccupiedCells: () =>
      (form.getValues("tracks") as Track[]).map((track) =>
        trackCellKey(track.movementKey, track.voiceCode, track.type),
      ),
    upload,
    placeTrack,
    pushUnassigned: (uploaded, reason) =>
      setUnassigned((autres) => [...autres, { ...uploaded, reason }]),
    announce,
  });

  /** Le libellé d'un type de piste. */
  const typeLabel = useCallback((type: AudioType) => TYPE_LABELS[type], []);

  /** Le libellé d'une case, pupitre compris quand elle en porte un. */
  function cellLabel(cellule: FreeCell): string {
    const label = cellule.voiceCode
      ? (voices.find((voice) => voice.code === cellule.voiceCode)?.label ??
        cellule.voiceCode)
      : null;
    return label
      ? `${label} · ${TYPE_LABELS[cellule.type]}`
      : TYPE_LABELS[cellule.type];
  }

  /** La piste posée sur une case, s'il y en a une. */
  function trackAt(
    movementKey: string,
    voiceCode: string | null,
    type: AudioType,
  ): Track | undefined {
    return tracks.find(
      (track) =>
        track.movementKey === movementKey &&
        track.voiceCode === voiceCode &&
        track.type === type,
    );
  }

  /** Toutes les cases attendues, dans l'ordre d'affichage. */
  const cellules: FreeCell[] = [
    ...retenus.flatMap((voice) =>
      PER_VOICE_TYPES.map((type) => ({ voiceCode: voice.code, type })),
    ),
    ...commonTypes.map((type) => ({ voiceCode: null, type })),
  ];
  const attendues = cellules.length * movements.length;

  /** Les cases encore libres d'un mouvement. */
  function freeCellsOf(movementKey: string): FreeCell[] {
    return cellules.filter(
      (cellule) => !trackAt(movementKey, cellule.voiceCode, cellule.type),
    );
  }

  /** Place un fichier non associé dans la case choisie. */
  function assign(item: UnassignedFile, cible: string) {
    const [movementKey, voice, type] = cible.split(" ");
    placeTrack(
      movementKey,
      voice === "" ? null : voice,
      type as AudioType,
      item,
    );
    setUnassigned((liste) => liste.filter((autre) => autre !== item));
    announce(`${item.filename} placé.`);
  }

  // Les erreurs de tracks atterrissent par index, et à la racine du tableau
  // pour les règles qui portent sur l'ensemble.
  const arrayError = form.formState.errors.tracks;
  const messages = [
    arrayError?.root?.message,
    arrayError?.message,
    ...(Array.isArray(arrayError)
      ? arrayError.map((entree) => entree?.message)
      : []),
  ].filter((message): message is string => Boolean(message));

  const exemple =
    (movements[0]?.title ? normalizeName(movements[0].title) : "kyrie") +
    "-" +
    (retenus[0] ? normalizeName(retenus[0].code) : "soprano") +
    "-predom.wav";

  return (
    <Section
      title="Pistes audio"
      action={
        <span className="text-sm text-muted-foreground tabular-nums">
          {tracks.length} sur {attendues} importées
        </span>
      }
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {cellules.length === 0 || movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ajoutez au moins un pupitre et un mouvement pour voir la matrice.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <AudioDropZone
              id={globalInputId}
              label="Déposer plusieurs fichiers d'un coup"
              hint="Ils se rangent tout seuls si leur nom suit la convention."
              onFiles={dropFiles}
            />

            <AudioNamingGuide example={exemple} movementRequired={plusieurs} />

            {recap ? (
              <p role="status" className="text-xs text-muted-foreground">
                {recap}
              </p>
            ) : null}
          </div>

          <UnassignedAudioList
            items={unassigned}
            movements={movements}
            freeCellsOf={freeCellsOf}
            cellLabel={cellLabel}
            onAssign={assign}
          />

          <AudioMatrixTable
            movements={movements}
            voices={retenus}
            commonTypes={commonTypes}
            storedMeta={storedMeta}
            uploads={uploads}
            removingKeys={removingKeys}
            uncertainCells={uncertainCells}
            typeLabel={typeLabel}
            trackAt={trackAt}
            onFile={uploadInto}
            onRemove={remove}
            onConfirm={confirmCell}
          />
        </>
      )}

      {busy ? (
        <p className="text-xs text-muted-foreground">
          Un envoi est en cours, l&apos;enregistrement attendra qu&apos;il soit
          terminé.
        </p>
      ) : null}

      {globalError ? (
        <p role="alert" className="text-xs text-destructive">
          {globalError}
        </p>
      ) : null}

      {messages.map((message, index) => (
        <p key={index} role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ))}
    </Section>
  );
}
