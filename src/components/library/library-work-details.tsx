"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { DownloadButton } from "@/components/work/download-button";
import {
  loadLibraryDownloads,
  type LibraryMovementFiles,
} from "@/lib/library/library-actions";
import { cn } from "@/lib/utils";

/**
 * Le détail d'une oeuvre : ses pupitres et ses fichiers, repliés d'emblée.
 *
 * @param workId - Oeuvre concernée.
 * @param returnTo - Chemin où revenir après connexion.
 * @param children - La grille des pupitres, rendue par le serveur : elle ne
 * coûte rien à transporter, mais suit le même repliement que les fichiers.
 * @returns Le panneau rendu.
 */
export function LibraryWorkDetails({
  workId,
  returnTo,
  children,
}: {
  workId: string;
  returnTo: string;
  children: ReactNode;
}) {
  const t = useTranslations("library");
  const panelId = useId();
  const [ouvert, setOuvert] = useState(false);
  const [movements, setMovements] = useState<LibraryMovementFiles[] | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, startTransition] = useTransition();

  function toggleDetails() {
    if (ouvert) {
      setOuvert(false);
      return;
    }
    setOuvert(true);
    if (movements !== null) return;

    setErreur(null);
    startTransition(async () => {
      try {
        const resultat = await loadLibraryDownloads(workId);
        if (!resultat.ok) {
          setErreur(t("filesError"));
          return;
        }
        setMovements(resultat.movements);
      } catch {
        // Une erreur levée dans une transition remonterait jusqu'à error.tsx
        // et remplacerait toute la page.
        setErreur(t("filesError"));
      }
    });
  }

  const seulMouvement = movements !== null && movements.length === 1;

  return (
    <div className="flex flex-col gap-4 border-t border-border p-5">
      <button
        type="button"
        onClick={toggleDetails}
        aria-expanded={ouvert}
        aria-controls={panelId}
        className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {ouvert ? t("seeLess") : t("seeMore")}
        <ChevronDown
          className={cn("size-4 transition-transform", ouvert && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        hidden={!ouvert}
        className="grid gap-5 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]"
      >
        {children}

        <div className="flex flex-col gap-4">
          {enCours ? (
            <p className="text-sm text-muted-foreground">{t("filesLoading")}</p>
          ) : null}
          {erreur ? (
            <p role="alert" className="text-sm text-destructive">
              {erreur}
            </p>
          ) : null}
          {movements !== null && movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("filesEmpty")}</p>
          ) : null}

          {(movements ?? []).map((movement) => (
            <section key={movement.movementId} className="flex flex-col gap-2">
              {seulMouvement ? null : (
                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {movement.movementTitle}
                </h4>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {movement.rows.map((row) => (
                  <DownloadButton
                    key={row.audioFileId}
                    row={row}
                    returnTo={returnTo}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
