"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useWatch } from "react-hook-form";

import { Section, useWorkForm } from "@/components/admin/work-form-fields";
import { Button } from "@/components/ui/button";
import { removeAudioTrack } from "@/lib/admin/audio-actions";
import { PER_VOICE_TYPES, trackCellKey } from "@/lib/admin/audio-upload";
import {
  deduceFilenames,
  normalize as normalizeName,
} from "@/lib/admin/filename-deduction";
import type { VoiceOption } from "@/lib/admin/voice-options";
import type { WorkFormDraft } from "@/lib/admin/work-form-draft";
import { requestAudioUpload } from "@/lib/admin/audio-actions";
import type { AudioType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * La matrice d'import audio.
 */

/** Une case du brouillon. */
type Track = WorkFormDraft["tracks"][number];

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
 * Ce que l'on sait d'une piste déjà enregistrée.
 */
export type StoredTrackMeta = Record<
  string,
  {
    filename: string;
    sizeBytes: number | null;
    mimeType: string;
  }
>;

/** L'état d'un envoi en cours, hors du brouillon exprès. */
type UploadState = { progress: number; error: string | null };

/** Un fichier téléversé mais pas encore placé dans une case. */
type Unassigned = {
  uploadId: string;
  filename: string;
  sizeBytes: number;
  durationSeconds: number;
  mimeType: string;
  /** Pourquoi la déduction n'a pas su le placer. */
  reason?: string;
};

/** Met une taille en octets sous une forme lisible. */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Lit la durée d'un fichier audio dans le navigateur.
 *
 * @param file - Le fichier choisi.
 * @returns La durée arrondie en secondes, ou null si elle est illisible.
 */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duree = Math.max(1, Math.round(audio.duration));
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duree) ? duree : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

/**
 * Envoie un fichier à l'URL signée, en suivant la progression.
 *
 * @param url - L'URL signée obtenue de l'action.
 * @param file - Le fichier à envoyer.
 * @param onProgress - Rappel de progression, en pourcentage.
 * @returns Vrai si R2 a accepté le fichier.
 */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

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
  const tracks = (useWatch({ control, name: "tracks" }) ?? []) as Track[];

  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [deployes, setDeployes] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [globalError, setGlobalError] = useState<string | null>(null);
  // Marque d'affichage seulement, tenue hors du brouillon : une fois la piste
  // enregistrée, c'est une piste comme une autre.
  const [douteuses, setDouteuses] = useState<string[]>([]);
  const [recap, setRecap] = useState<string | null>(null);
  const globalInputId = useId();

  const busy = Object.values(uploads).some((etat) => etat.error === null);
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const plusieurs = movements.length > 1;
  const types: AudioType[] = [
    ...COMMON_TYPES.filter(
      (type) => type !== "ACCOMPANIMENT" || hasAccompaniment,
    ),
  ];
  const retenus = voices.filter((voice) => voiceCodes.includes(voice.code));

  /** Le libellé d'un pupitre, en retombant sur son code. */
  function labelOf(code: string): string {
    return voices.find((voice) => voice.code === code)?.label ?? code;
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
  function expectedCells(): { voiceCode: string | null; type: AudioType }[] {
    return [
      ...retenus.flatMap((voice) =>
        PER_VOICE_TYPES.map((type) => ({ voiceCode: voice.code, type })),
      ),
      ...types.map((type) => ({ voiceCode: null, type })),
    ];
  }

  const cellules = expectedCells();
  const attendues = cellules.length * movements.length;
  const remplies = tracks.length;

  /** Remplace la case visée dans le brouillon. */
  function writeTrack(next: Track) {
    // On relit la valeur vive du formulaire, pas celle de la passe de rendu :
    // un dépôt multiple écrit plusieurs pistes dans la même fermeture, et une
    // liste figée ferait écraser chaque piste par la suivante.
    const autres = (form.getValues("tracks") as Track[]).filter(
      (track) =>
        !(
          track.movementKey === next.movementKey &&
          track.voiceCode === next.voiceCode &&
          track.type === next.type
        ),
    );
    form.setValue("tracks", [...autres, next], {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  /** Retire la case du brouillon, sans rien supprimer côté serveur. */
  function dropTrack(track: Track) {
    form.setValue(
      "tracks",
      tracks.filter((autre) => autre !== track),
      { shouldValidate: true, shouldDirty: true },
    );
  }

  /**
   * Téléverse un fichier et renvoie de quoi le poser dans une case.
   *
   * @param file - Fichier choisi par l'administrateur.
   * @param cellKey - Case visée, ou une clé de dépôt global.
   * @returns Les métadonnées du fichier envoyé, ou null en cas d'échec.
   */
  async function upload(
    file: File,
    cellKey: string,
  ): Promise<Unassigned | null> {
    setUploads((etat) => ({
      ...etat,
      [cellKey]: { progress: 0, error: null },
    }));
    setAnnouncement(`Envoi de ${file.name} commencé.`);

    const durationSeconds = await readDuration(file);
    if (durationSeconds === null) {
      const message = "Durée illisible, ce fichier n'est pas un audio valide.";
      setUploads((etat) => ({
        ...etat,
        [cellKey]: { progress: 0, error: message },
      }));
      setAnnouncement(`Envoi de ${file.name} refusé. ${message}`);
      return null;
    }

    const ticket = await requestAudioUpload({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      durationSeconds,
    });

    if (!ticket.ok) {
      setUploads((etat) => ({
        ...etat,
        [cellKey]: { progress: 0, error: ticket.error },
      }));
      setAnnouncement(`Envoi de ${file.name} refusé. ${ticket.error}`);
      return null;
    }

    const envoye = await putWithProgress(ticket.url, file, (progress) => {
      setUploads((etat) => ({ ...etat, [cellKey]: { progress, error: null } }));
    });

    if (!envoye) {
      const message = "L'envoi a échoué, réessayez.";
      setUploads((etat) => ({
        ...etat,
        [cellKey]: { progress: 0, error: message },
      }));
      setAnnouncement(`Envoi de ${file.name} échoué.`);
      return null;
    }

    setUploads((etat) => {
      const suite = { ...etat };
      delete suite[cellKey];
      return suite;
    });
    setAnnouncement(`${file.name} envoyé.`);

    return {
      uploadId: ticket.uploadId,
      filename: file.name,
      sizeBytes: file.size,
      durationSeconds,
      mimeType: file.type,
    };
  }

  /** Envoie un fichier directement dans une case. */
  async function uploadInto(
    file: File,
    movementKey: string,
    voiceCode: string | null,
    type: AudioType,
  ) {
    const cellKey = trackCellKey(movementKey, voiceCode, type);
    const envoye = await upload(file, cellKey);
    if (!envoye) return;
    writeTrack({
      movementKey,
      voiceCode,
      type,
      state: { kind: "pending", ...envoye },
    });
  }

  /**
   * Envoie des fichiers déposés globalement, en les plaçant si le nom le dit.
   */
  async function uploadUnassigned(files: FileList) {
    setGlobalError(null);
    setRecap(null);

    const liste = Array.from(files);
    const lot = deduceFilenames(
      liste.map((file) => file.name),
      {
        movements: movements.map((movement) => ({
          key: movement.key,
          title: movement.title,
        })),
        voices: retenus,
        hasAccompaniment: Boolean(hasAccompaniment),
        occupied: (form.getValues("tracks") as Track[]).map((track) =>
          trackCellKey(track.movementKey, track.voiceCode, track.type),
        ),
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
      const envoye = await upload(file, cellKey);
      if (!envoye) continue;
      writeTrack({
        movementKey: placement.movementKey,
        voiceCode: placement.voiceCode,
        type: placement.type,
        state: { kind: "pending", ...envoye },
      });
      places += 1;
      if (placement.confidence === "probable") {
        aVerifier += 1;
        setDouteuses((cles) =>
          cles.includes(cellKey) ? cles : [...cles, cellKey],
        );
      }
    }

    for (const refus of lot.rejected) {
      const file = parNom.get(refus.filename);
      if (!file) continue;
      const envoye = await upload(file, `global-${refus.filename}`);
      if (!envoye) continue;
      setUnassigned((autres) => [
        ...autres,
        { ...envoye, reason: refus.reason },
      ]);
      restants += 1;
    }

    const phrase = [
      `${places} fichier${places > 1 ? "s" : ""} placé${places > 1 ? "s" : ""}`,
      `${aVerifier} à vérifier`,
      `${restants} à classer à la main`,
    ].join(", ");
    setRecap(phrase);
    setAnnouncement(phrase);
  }

  /** Lève la marque à vérifier d'une case. */
  function confirmer(cellKey: string) {
    setDouteuses((cles) => cles.filter((autre) => autre !== cellKey));
  }

  /** Place un fichier non associé dans une case. */
  function assign(item: Unassigned, cible: string) {
    const [movementKey, voice, type] = cible.split(" ");
    writeTrack({
      movementKey,
      voiceCode: voice === "" ? null : voice,
      type: type as AudioType,
      state: { kind: "pending", ...item },
    });
    setUnassigned((liste) => liste.filter((autre) => autre !== item));
    setAnnouncement(`${item.filename} placé.`);
  }

  /** Retire une piste, en supprimant l'objet si elle est déjà en base. */
  async function remove(track: Track) {
    if (track.state.kind === "stored") {
      const confirme = window.confirm(
        "Cette piste est déjà enregistrée. La retirer supprimera définitivement le fichier audio. Continuer ?",
      );
      if (!confirme) return;
      const retrait = await removeAudioTrack(track.state.audioFileId);
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
    dropTrack(track);
    setAnnouncement("Piste retirée.");
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

  return (
    <Section
      title="Pistes audio"
      action={
        <span className="text-sm text-muted-foreground tabular-nums">
          {remplies} sur {attendues} importées
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
            <DropZone
              id={globalInputId}
              label="Déposer plusieurs fichiers d'un coup"
              hint="Ils se rangent tout seuls si leur nom suit la convention."
              onFiles={uploadUnassigned}
            />

            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Comment nommer les fichiers
              </p>
              <p className="mt-1">
                mouvement-pupitre-type.extension, séparés par des tirets
                simples. Exemple :{" "}
                <span className="font-medium text-foreground">
                  {(movements[0]?.title
                    ? normalizeName(movements[0].title)
                    : "kyrie") +
                    "-" +
                    (retenus[0] ? normalizeName(retenus[0].code) : "soprano") +
                    "-predom.wav"}
                </span>
              </p>
              <p className="mt-1">
                {plusieurs
                  ? "Le mouvement est obligatoire, cette œuvre en compte plusieurs."
                  : "Le mouvement est facultatif, cette œuvre n'en a qu'un."}{" "}
                Tutti et accompagnement s&apos;écrivent sans pupitre. Les
                abréviations passent aussi, sop, s, ms, ct, ainsi que predom,
                mix, apercu.
              </p>
            </div>

            {recap ? (
              <p role="status" className="text-xs text-muted-foreground">
                {recap}
              </p>
            ) : null}
          </div>

          {unassigned.length > 0 ? (
            <ul className="flex flex-col gap-2 rounded-xl border border-border p-3">
              {unassigned.map((item) => (
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
                        if (event.target.value)
                          assign(item, event.target.value);
                      }}
                    >
                      <option value="">Placer dans une case...</option>
                      {movements.map((movement) => (
                        <optgroup key={movement.key} label={movement.title}>
                          {cellules
                            .filter(
                              (cellule) =>
                                !trackAt(
                                  movement.key,
                                  cellule.voiceCode,
                                  cellule.type,
                                ),
                            )
                            .map((cellule) => (
                              <option
                                key={`${cellule.voiceCode}-${cellule.type}`}
                                value={`${movement.key} ${cellule.voiceCode ?? ""} ${cellule.type}`}
                              >
                                {cellule.voiceCode
                                  ? `${labelOf(cellule.voiceCode)} · ${TYPE_LABELS[cellule.type]}`
                                  : TYPE_LABELS[cellule.type]}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

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
                {retenus.map((voice) => {
                  const cellesDuPupitre = movements.flatMap((movement) =>
                    PER_VOICE_TYPES.map((type) =>
                      trackAt(movement.key, voice.code, type),
                    ),
                  );
                  const posees = cellesDuPupitre.filter(Boolean).length;
                  const vide = posees === 0;
                  const ouvert = !vide || deployes.includes(voice.code);

                  return (
                    <VoiceGroup
                      key={voice.code}
                      label={voice.label}
                      posees={posees}
                      total={cellesDuPupitre.length}
                      ouvert={ouvert}
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
                          label={`${voice.label} · ${TYPE_LABELS[type]}`}
                          movements={movements}
                          plusieurs={plusieurs}
                          render={(movement) => (
                            <Cell
                              track={trackAt(movement.key, voice.code, type)}
                              meta={storedMeta}
                              upload={
                                uploads[
                                  trackCellKey(movement.key, voice.code, type)
                                ]
                              }
                              name={`${voice.label}, ${TYPE_LABELS[type]}, ${movement.title || "sans titre"}`}
                              douteuse={douteuses.includes(
                                trackCellKey(movement.key, voice.code, type),
                              )}
                              onFile={(file) =>
                                uploadInto(file, movement.key, voice.code, type)
                              }
                              onRemove={remove}
                              onConfirm={() =>
                                confirmer(
                                  trackCellKey(movement.key, voice.code, type),
                                )
                              }
                            />
                          )}
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
                {types.map((type) => (
                  <MatrixRow
                    key={type}
                    label={TYPE_LABELS[type]}
                    movements={movements}
                    plusieurs={plusieurs}
                    render={(movement) => (
                      <Cell
                        track={trackAt(movement.key, null, type)}
                        meta={storedMeta}
                        upload={uploads[trackCellKey(movement.key, null, type)]}
                        name={`${TYPE_LABELS[type]}, ${movement.title || "sans titre"}`}
                        douteuse={douteuses.includes(
                          trackCellKey(movement.key, null, type),
                        )}
                        onFile={(file) =>
                          uploadInto(file, movement.key, null, type)
                        }
                        onRemove={remove}
                        onConfirm={() =>
                          confirmer(trackCellKey(movement.key, null, type))
                        }
                      />
                    )}
                  />
                ))}
              </tbody>
            </table>
          </div>
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

/** Un groupe de lignes pour un pupitre, replié quand il est vide. */
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

/** Une ligne de la matrice, un intitulé puis une case par mouvement. */
function MatrixRow({
  label,
  movements,
  plusieurs,
  render,
}: {
  label: string;
  movements: WorkFormDraft["movements"];
  plusieurs: boolean;
  render: (movement: WorkFormDraft["movements"][number]) => React.ReactNode;
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

/** Une case, remplie ou en attente d'un fichier. */
function Cell({
  track,
  meta,
  upload,
  name,
  douteuse,
  onFile,
  onRemove,
  onConfirm,
}: {
  track: Track | undefined;
  meta: StoredTrackMeta;
  upload: UploadState | undefined;
  name: string;
  /** Vrai quand la déduction n'était que probable. */
  douteuse?: boolean;
  onFile: (file: File) => void;
  onRemove: (track: Track) => void;
  onConfirm?: () => void;
}) {
  const inputId = useId();

  if (upload) {
    return upload.error ? (
      <div className="flex flex-col gap-1">
        <p className="flex items-start gap-1 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {upload.error}
        </p>
        <DropZone
          id={inputId}
          label={`Réessayer, ${name}`}
          onFile={onFile}
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
          douteuse
            ? "flex items-center gap-1 rounded-lg border border-primary/60 bg-primary/5 p-1"
            : "flex items-center gap-1"
        }
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs" title={infos?.filename}>
            {infos?.filename ?? "Enregistrée"}
          </span>
          {douteuse ? (
            <button
              type="button"
              onClick={onConfirm}
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
          className="size-6 shrink-0 cursor-pointer rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3" aria-hidden="true" />
          <span className="sr-only">Retirer {name}</span>
        </Button>
      </div>
    );
  }

  return (
    <DropZone
      id={inputId}
      label={`Déposer un fichier, ${name}`}
      onFile={onFile}
      compact
    />
  );
}

/**
 * Une zone de dépôt, qui accepte le glisser comme le choix par bouton.
 */
function DropZone({
  id,
  label,
  hint,
  compact,
  onFile,
  onFiles,
}: {
  id: string;
  label: string;
  hint?: string;
  compact?: boolean;
  onFile?: (file: File) => void;
  onFiles?: (files: FileList) => void;
}) {
  const [survole, setSurvole] = useState(false);

  /** Traite les fichiers d'un dépôt ou d'un choix. */
  function accepte(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (onFiles) onFiles(files);
    else if (onFile) onFile(files[0]);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setSurvole(true);
      }}
      onDragLeave={() => setSurvole(false)}
      onDrop={(event) => {
        event.preventDefault();
        setSurvole(false);
        accepte(event.dataTransfer.files);
      }}
      className={cn(
        "rounded-lg border border-dashed border-border text-center",
        compact ? "px-2 py-1.5" : "px-4 py-6",
        survole && "border-primary bg-primary/10",
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-1.5 text-muted-foreground",
          compact ? "text-[0.625rem]" : "text-sm",
        )}
      >
        <Upload className={compact ? "size-3" : "size-4"} aria-hidden="true" />
        {compact ? "Déposer" : label}
        {compact ? <span className="sr-only">{label}</span> : null}
      </label>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <input
        id={id}
        type="file"
        accept="audio/wav,audio/mpeg,audio/flac,.wav,.mp3,.flac"
        multiple={Boolean(onFiles)}
        className="sr-only"
        onChange={(event) => {
          accepte(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
