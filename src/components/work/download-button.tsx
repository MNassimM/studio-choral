"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { requestTrackDownload } from "@/lib/downloads/download-actions";

/**
 * Enveloppe cliquable d'une piste téléchargeable.
 *
 * @param audioFileId - Piste demandée, seule donnée envoyée au serveur.
 * @param owned - Ce que la page croit savoir ; le serveur retranche.
 * @param returnTo - Chemin où revenir après connexion.
 * @param className - Classes du bouton.
 * @param children - Le contenu de la carte, rendu côté serveur.
 * @returns Le bouton rendu.
 */
export function DownloadButton({
  audioFileId,
  owned,
  returnTo,
  className,
  children,
}: {
  audioFileId: string;
  owned: boolean;
  returnTo: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("work.workPage");
  const router = useRouter();
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function demander() {
    setErreur(null);
    startTransition(async () => {
      let ticket: Awaited<ReturnType<typeof requestTrackDownload>>;
      try {
        ticket = await requestTrackDownload(audioFileId);
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
        disabled={!owned || enCours}
        aria-busy={enCours}
        onClick={demander}
        className={className}
      >
        {children}
      </button>
      {erreur ? (
        <p role="alert" className="px-3 text-xs text-destructive">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
