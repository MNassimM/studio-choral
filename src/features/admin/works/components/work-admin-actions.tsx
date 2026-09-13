"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/shared/components/ui/button";
import type { WorkActionResult } from "@/features/admin/works/form/work-form-draft";

/**
 * Publication, dépublication et suppression d'une oeuvre.
 */

/**
 * Confirmation de suppression, build seulement quand elle est ouverte.
 */
function DeletionConfirmation({
  title,
  onCancel,
  onConfirm,
  enCours,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  enCours: boolean;
}) {
  return (
    <Dialog.Root
      modal
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[1px]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-xl">
          <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
            <Trash2 className="size-4 text-destructive" aria-hidden="true" />
            Supprimer cette œuvre
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {title} sera supprimée définitivement, avec ses mouvements, ses
            traductions et ses offres. Cette action est irréversible.
          </Dialog.Description>
          <div className="flex justify-end gap-3">
            <Dialog.Close
              render={
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-full"
                />
              }
            >
              Annuler
            </Dialog.Close>
            <Button
              type="button"
              disabled={enCours}
              onClick={onConfirm}
              className="cursor-pointer rounded-full bg-destructive text-white hover:bg-destructive/90"
            >
              {enCours ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Supprimer {title}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Les actions qui portent sur l'oeuvre entière.
 *
 * @param workId - Oeuvre concernée.
 * @param title - Titre affiché dans la confirmation.
 * @param isPublished - État courant, qui décide du bouton montré.
 * @param onDelete - Action de suppression, qui redirige en cas de succès.
 * @returns Les boutons rendus.
 */
export function WorkAdminActions({
  workId,
  title,
  isPublished,
  onDelete,
}: {
  workId: string;
  title: string;
  isPublished: boolean;
  onDelete: (workId: string) => Promise<WorkActionResult>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, demarrer] = useTransition();

  /** Lance une action et affiche son refus si nécessaire. */
  function run(action: (id: string) => Promise<WorkActionResult>) {
    setMessage(null);
    demarrer(async () => {
      const result = await action(workId);
      if (!result.ok) setMessage(result.error);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-5">
      <h2 className="font-medium">Supprimer</h2>

      <p className="text-sm text-muted-foreground">
        {isPublished
          ? "Cette œuvre est visible dans le catalogue public. Publier ou dépublier se fait depuis l'entête du formulaire."
          : "Cette œuvre est en brouillon, elle n'apparaît nulle part. Publier se fait depuis l'entête du formulaire."}
      </p>

      {message ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle
            className="mt-0.5 size-3.5 shrink-0"
            aria-hidden="true"
          />
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={enCours}
          onClick={() => setConfirmation(true)}
          className="cursor-pointer rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Supprimer l&apos;œuvre
        </Button>
      </div>

      {confirmation ? (
        <DeletionConfirmation
          title={title}
          enCours={enCours}
          onCancel={() => setConfirmation(false)}
          onConfirm={() => {
            setConfirmation(false);
            run(onDelete);
          }}
        />
      ) : null}
    </section>
  );
}
