"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * La zone de dépôt de fichiers audio.
 */

/**
 * Une zone de dépôt, qui accepte le glisser comme le choix par bouton.
 *
 * @param id - Identifiant de l'entrée fichier, relié au libellé.
 * @param label - Libellé de la zone, lu par les lecteurs d'écran.
 * @param hint - Précision affichée sous la zone.
 * @param compact - Rend la version réduite, celle des cases de la matrice.
 * @param onFile - Reçoit le premier fichier, pour une case.
 * @param onFiles - Reçoit tous les fichiers, pour le dépôt global.
 * @returns La zone rendue.
 */
export function AudioDropZone({
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
  function acceptFiles(files: FileList | null) {
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
        acceptFiles(event.dataTransfer.files);
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
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
