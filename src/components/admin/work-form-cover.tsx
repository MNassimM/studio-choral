"use client";

import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  describeUploadFailure,
  putWithProgress,
} from "@/components/admin/put-with-progress";
import { Section, useWorkForm } from "@/components/admin/work-form-fields";
import { Button } from "@/components/ui/button";
import { requestCoverUpload } from "@/lib/admin/images/cover-actions";
import { COVER_EXTENSIONS, MAX_COVER_BYTES } from "@/lib/storage/keys";
import { cn } from "@/lib/utils";

/**
 * L'éditeur d'image de couverture.
 */

/** Types acceptés par l'entrée fichier, alignés sur la validation serveur. */
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * La section de dépôt de l'image de couverture.
 *
 * @remarks
 * L'aperçu d'une image déjà enregistrée vient du serveur : composer son URL
 * demande la racine publique du bucket, qui vit dans un module server-only.
 * Une image tout juste déposée s'affiche, elle, depuis le fichier local, sans
 * attendre le moindre aller-retour.
 *
 * @param previewUrl - URL de l'image déjà enregistrée, ou null.
 * @returns La section rendue.
 */
export function WorkCoverSection({
  previewUrl,
}: {
  previewUrl: string | null;
}) {
  const form = useWorkForm();
  // Le champ porte une valeur par défaut côté schéma, mais il est optionnel
  // dans le type d'entrée : un brouillon ancien peut ne pas le porter.
  const cover = form.watch("cover") ?? { kind: "none" as const };
  const [apercuLocal, setApercuLocal] = useState<string | null>(null);
  const [progression, setProgression] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const entree = useRef<HTMLInputElement>(null);

  // Une URL d'objet retient le fichier en mémoire tant qu'elle vit.
  useEffect(() => {
    return () => {
      if (apercuLocal) URL.revokeObjectURL(apercuLocal);
    };
  }, [apercuLocal]);

  const envoiEnCours = progression !== null;
  const source = apercuLocal ?? (cover.kind === "stored" ? previewUrl : null);

  /**
   * Envoie le fichier choisi, puis le pose dans le brouillon.
   *
   * @param file - Fichier choisi ou déposé.
   */
  async function deposer(file: File) {
    setErreur(null);
    setProgression(0);

    const ticket = await requestCoverUpload({
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });

    if (!ticket.ok) {
      setErreur(ticket.error);
      setProgression(null);
      return;
    }

    const envoye = await putWithProgress(ticket.url, file, setProgression);
    if (!envoye.ok) {
      setErreur(describeUploadFailure(envoye.status));
      setProgression(null);
      return;
    }

    if (apercuLocal) URL.revokeObjectURL(apercuLocal);
    setApercuLocal(URL.createObjectURL(file));
    form.setValue(
      "cover",
      {
        kind: "pending",
        uploadId: ticket.uploadId,
        filename: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
      },
      { shouldDirty: true },
    );
    setProgression(null);
  }

  /** Retire l'image du brouillon. L'objet ne partira qu'à l'enregistrement. */
  function retirer() {
    if (apercuLocal) URL.revokeObjectURL(apercuLocal);
    setApercuLocal(null);
    setErreur(null);
    form.setValue("cover", { kind: "none" }, { shouldDirty: true });
    if (entree.current) entree.current.value = "";
  }

  const mo = Math.round(MAX_COVER_BYTES / (1024 * 1024));

  return (
    <Section title="Image de couverture">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary",
            !source && "border-dashed text-muted-foreground",
          )}
        >
          {source ? (
            // Pas next/image ici : l'aperçu local est une URL d'objet, que
            // l'optimiseur ne sait pas traiter. Les pages publiques, elles,
            // passent bien par next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source}
              alt=""
              className="size-full object-cover"
              aria-hidden="true"
            />
          ) : (
            <ImageOff className="size-7" aria-hidden="true" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Formats acceptés : {COVER_EXTENSIONS.join(", ")}.
            <br />
            <br />
            Taille maximale : <br />
            {mo} Mo.
          </p>

          <input
            ref={entree}
            id="cover-file"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void deposer(file);
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={envoiEnCours}
          onClick={() => entree.current?.click()}
        >
          {envoiEnCours ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {source ? "Remplacer l'image" : "Choisir une image"}
        </Button>

        {source ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={envoiEnCours}
            onClick={retirer}
            className="text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Retirer
          </Button>
        ) : null}
      </div>

      {envoiEnCours ? (
        <p role="status" className="text-xs text-muted-foreground">
          Envoi en cours, {progression} %
        </p>
      ) : null}

      {cover.kind === "pending" ? (
        <p className="text-xs text-muted-foreground">
          {cover.filename} — rangée à l&apos;enregistrement.
        </p>
      ) : null}

      {erreur ? (
        <p role="alert" className="text-xs text-destructive">
          {erreur}
        </p>
      ) : null}
    </Section>
  );
}
