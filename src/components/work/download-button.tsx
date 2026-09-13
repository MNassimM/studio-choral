"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, FileHeadphone, Loader2, LockKeyhole } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { requestTrackDownload } from "@/lib/downloads/download-actions";
import type { DownloadRowView } from "@/lib/works/download-groups";
import { cn } from "@/lib/utils";

/**
 * Une piste téléchargeable, cliquable.
 *
 * @remarks
 * La page oeuvre et la bibliothèque passent la même ligne, et affichent donc exactement la même carte.
 *
 * @param row - Ligne à afficher, libellés déjà traduits.
 * @param returnTo - Chemin où revenir après connexion.
 * @returns La carte rendue.
 */
export function DownloadButton({
  row,
  returnTo,
}: {
  row: DownloadRowView;
  returnTo: string;
}) {
  const t = useTranslations("work.workPage");
  const router = useRouter();
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function requestDownload() {
    setErreur(null);
    startTransition(async () => {
      let ticket: Awaited<ReturnType<typeof requestTrackDownload>>;
      try {
        ticket = await requestTrackDownload(row.audioFileId);
      } catch {
        // Réseau coupé ou exception serveur : une erreur levée dans une
        // transition remonterait jusqu'à error.tsx et remplacerait toute la
        // page. Un échec de téléchargement ne mérite qu'un message sur sa carte.
        setErreur(t("downloadRefusal.unavailable"));
        return;
      }

      if (ticket.ok) {
        // L'objet est servi avec Content-Disposition: attachment, le
        // navigateur télécharge sans quitter la page. Un <a download> serait
        // ignoré : la cible est sur un autre domaine.
        window.location.href = ticket.url;
        return;
      }
      if (ticket.reason === "unauthenticated") {
        router.push({ pathname: "/connexion", query: { next: returnTo } });
        return;
      }
      setErreur(t(`downloadRefusal.${ticket.reason}`));
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={!row.owned || enCours}
        aria-busy={enCours}
        onClick={requestDownload}
        className={cn(
          "flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left transition-colors",
          row.owned
            ? "cursor-pointer border-border hover:bg-accent"
            : "cursor-not-allowed border-border/60 bg-muted/30 opacity-70",
        )}
      >
        <FileHeadphone
          className="size-4 shrink-0 text-primary"
          aria-hidden="true"
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-tight font-medium">
            {row.title}
          </span>
          <span className="block text-xs text-muted-foreground">
            {row.meta}
          </span>
        </span>

        {enCours ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-primary"
            aria-hidden="true"
          />
        ) : row.owned ? (
          <Download
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
        ) : (
          <LockKeyhole
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>
      {erreur ? (
        <p role="alert" className="px-3 text-xs text-destructive">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
