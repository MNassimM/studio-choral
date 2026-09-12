"use client";

import { useCallback, useState } from "react";

import {
  describeUploadFailure,
  putWithProgress,
} from "@/components/admin/put-with-progress";
import { requestAudioUpload } from "@/lib/admin/audio/audio-actions";
import type { WorkFormDraft } from "@/lib/admin/form/work-form-draft";

/**
 * Le téléversement audio : ses types, son état et son envoi.
 */

/** Une case du brouillon. */
export type Track = WorkFormDraft["tracks"][number];

/** Ce que l'on sait d'une piste déjà enregistrée. */
export type StoredTrackMeta = Record<
  string,
  {
    filename: string;
    sizeBytes: number | null;
    mimeType: string;
  }
>;

/** L'état d'un envoi en cours, hors du brouillon exprès. */
export type UploadState = { progress: number; error: string | null };

/** Un fichier arrivé sur le stockage, pas encore posé dans une case. */
export type UploadedFile = {
  uploadId: string;
  filename: string;
  sizeBytes: number;
  durationSeconds: number;
  mimeType: string;
};

/**
 * Met une taille en octets sous une forme lisible.
 *
 * @param bytes - Taille du fichier.
 * @returns La taille en kilooctets ou en mégaoctets.
 */
export function formatSize(bytes: number): string {
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

/** Ce que le crochet de téléversement rend à la section. */
export type AudioUpload = {
  /** L'envoi en cours de chaque case, par clé de case. */
  uploads: Record<string, UploadState>;
  /** Vrai tant qu'un envoi n'est ni terminé ni en erreur. */
  busy: boolean;
  /** Le dernier message destiné aux lecteurs d'écran. */
  announcement: string;
  /** Pose un message à annoncer. */
  announce: (message: string) => void;
  /** Envoie un fichier et rend de quoi le poser dans une case. */
  upload: (file: File, cellKey: string) => Promise<UploadedFile | null>;
};

/**
 * Tient l'état des envois et parle au stockage.
 *
 * @returns L'état des envois et la fonction d'envoi.
 */
export function useAudioUpload(): AudioUpload {
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [announcement, setAnnouncement] = useState("");

  const busy = Object.values(uploads).some((etat) => etat.error === null);

  // Référence stable : elle descend jusqu'aux cases, qui sont mémoïsées.
  const upload = useCallback(
    async (file: File, cellKey: string): Promise<UploadedFile | null> => {
      /** Marque la case en échec et annonce le refus. */
      function refuser(message: string) {
        setUploads((etat) => ({
          ...etat,
          [cellKey]: { progress: 0, error: message },
        }));
        setAnnouncement(`Envoi de ${file.name} refusé. ${message}`);
      }

      setUploads((etat) => ({
        ...etat,
        [cellKey]: { progress: 0, error: null },
      }));
      setAnnouncement(`Envoi de ${file.name} commencé.`);

      const durationSeconds = await readDuration(file);
      if (durationSeconds === null) {
        refuser("Durée illisible, ce fichier n'est pas un audio valide.");
        return null;
      }

      const ticket = await requestAudioUpload({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        durationSeconds,
      });

      if (!ticket.ok) {
        refuser(ticket.error);
        return null;
      }

      const envoye = await putWithProgress(ticket.url, file, (progress) => {
        setUploads((etat) => ({
          ...etat,
          [cellKey]: { progress, error: null },
        }));
      });

      if (!envoye.ok) {
        // Annonce volontairement différente des deux refus ci dessus : ici le
        // fichier était accepté, c'est le transfert qui a lâché.
        setUploads((etat) => ({
          ...etat,
          [cellKey]: {
            progress: 0,
            error: describeUploadFailure(envoye.status),
          },
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
    },
    [],
  );

  return { uploads, busy, announcement, announce: setAnnouncement, upload };
}
