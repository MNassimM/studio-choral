"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/shared/components/ui/button";
import type { WorkActionResult } from "@/features/admin/works/form/work-form-draft";

/**
 * Publier ou dépublier, à côté d'Annuler et d'Enregistrer.
 *
 * @remarks
 * Le bouton est grisé tant que le brouillon porte des modifications non
 * enregistrées : on ne décide pas de publier un état qui n'existe pas encore
 * en base. Le garde fou est purement visuel, publishWork revalide de son côté.
 */
export function WorkPublishButtons({
  workId,
  isPublished,
  disabled,
  onPublish,
  onUnpublish,
  onError,
}: {
  workId: string;
  isPublished: boolean;
  /** Vrai tant que des modifications ne sont pas enregistrées. */
  disabled: boolean;
  onPublish: (workId: string) => Promise<WorkActionResult>;
  onUnpublish: (workId: string) => Promise<WorkActionResult>;
  onError: (message: string | null) => void;
}) {
  const [enCours, demarrer] = useTransition();

  /** Lance une action et remonte son refus au bandeau du formulaire. */
  function run(action: (id: string) => Promise<WorkActionResult>) {
    onError(null);
    demarrer(async () => {
      const result = await action(workId);
      if (!result.ok) onError(result.error);
    });
  }

  const empeche = disabled || enCours;
  const raison = disabled
    ? "Enregistrez vos modifications avant de changer la publication."
    : undefined;

  return isPublished ? (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={empeche}
      title={raison}
      onClick={() => run(onUnpublish)}
      className="cursor-pointer rounded-full"
    >
      {enCours ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <EyeOff className="size-4" aria-hidden="true" />
      )}
      Dépublier
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={empeche}
      title={raison}
      onClick={() => run(onPublish)}
      className="cursor-pointer rounded-full"
    >
      {enCours ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Eye className="size-4" aria-hidden="true" />
      )}
      Publier
    </Button>
  );
}
