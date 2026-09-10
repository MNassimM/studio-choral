"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowDown,
  ArrowUp,
  Scissors,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";

import {
  Champ,
  Section,
  useWorkForm,
} from "@/components/admin/work-form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newMovementKey } from "@/lib/admin/form/work-form-draft";

/**
 * L'éditeur de mouvements de l'oeuvre.
 */

/**
 * Confirmation avant de retirer un mouvement déjà enregistréen base.
 */
function ConfirmationRetrait({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
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
            <TriangleAlert
              className="size-4 text-destructive"
              aria-hidden="true"
            />
            Retirer ce mouvement
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {title} est déjà enregistré. Le retirer supprimera aussi ses pistes
            audio, définitivement.
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
              onClick={onConfirm}
              className="cursor-pointer rounded-full bg-destructive text-white hover:bg-destructive/90"
            >
              Retirer {title}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Les mouvements de l'oeuvre, en affichage simple ou complet.
 *
 * @param titreSuiviLOeuvre - Vrai si le mouvement unique reprend le titre de
 * l'oeuvre. Faux quand une oeuvre déjà en base en diverge.
 * @param reprendreLeTitre - Réaligne le mouvement unique sur le titre de
 * l'oeuvre et relance le suivi.
 * @returns La section rendue.
 */
export function WorkMovementsSection({
  titreSuiviLOeuvre,
  reprendreLeTitre,
}: {
  titreSuiviLOeuvre: boolean;
  reprendreLeTitre: () => void;
}) {
  const form = useWorkForm();
  const control = form.control;

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "movements",
    keyName: "rhfKey",
  });

  const titres = useWatch({ control, name: "movements" });

  const [annonce, setAnnonce] = useState("");
  const [aRetirer, setARetirer] = useState<number | null>(null);

  const plusieurs = fields.length > 1;
  const erreurTableau = form.formState.errors.movements;
  const erreur = erreurTableau?.root?.message ?? erreurTableau?.message;

  /** Le titre affiché pour une ligne, en retombant sur un libellé de secours. */
  function titreDe(index: number): string {
    return titres?.[index]?.title || `Mouvement ${index + 1}`;
  }

  /** Découpe l'oeuvre en ajoutant un second mouvement. */
  function decouper() {
    append({ key: newMovementKey(), title: "" });
    setAnnonce(
      "Découpage activé. Deux mouvements, chacun avec son titre et son ordre.",
    );
  }

  /** Ajoute un mouvement vide à la fin. */
  function ajouter() {
    append({ key: newMovementKey(), title: "" });
    setAnnonce(`Mouvement ajouté en position ${fields.length + 1}.`);
  }

  /** Déplace un mouvement d'un cran et annonce le résultat. */
  function deplacer(index: number, sens: -1 | 1) {
    const cible = index + sens;
    if (cible < 0 || cible >= fields.length) return;
    const nom = titreDe(index);
    move(index, cible);
    setAnnonce(`${nom} déplacé en position ${cible + 1} sur ${fields.length}.`);
  }

  /** Retire une ligne, et relance le suivi du titre s'il n'en reste qu'une. */
  function retirer(index: number) {
    const nom = titreDe(index);
    remove(index);
    if (fields.length - 1 <= 1) {
      reprendreLeTitre();
      setAnnonce(
        `${nom} retiré. Un seul mouvement, il reprend le titre de l'œuvre.`,
      );
    } else {
      setAnnonce(`${nom} retiré. ${fields.length - 1} mouvements restants.`);
    }
  }

  /** Demande confirmation quand la ligne existe déjà en base. */
  function demanderRetrait(index: number) {
    if (titres?.[index]?.id) {
      setARetirer(index);
      return;
    }
    retirer(index);
  }

  return (
    <Section
      title="Mouvements"
      action={
        plusieurs ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={ajouter}
            className="cursor-pointer rounded-full"
          >
            Ajouter un mouvement
          </Button>
        ) : null
      }
    >
      <p aria-live="polite" className="sr-only">
        {annonce}
      </p>

      {plusieurs ? (
        <ul className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <li key={field.rhfKey} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-2 w-4 shrink-0 text-right text-sm text-muted-foreground tabular-nums"
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <Champ
                  label={`Titre du mouvement ${index + 1}`}
                  name={`movements.${index}.title`}
                  required
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      placeholder="Ex : Kyrie"
                      {...form.register(`movements.${index}.title`)}
                    />
                  )}
                </Champ>
              </div>

              <div className="mt-6 flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => deplacer(index, -1)}
                  className="cursor-pointer rounded-full"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                  <span className="sr-only">Monter {titreDe(index)}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === fields.length - 1}
                  onClick={() => deplacer(index, 1)}
                  className="cursor-pointer rounded-full"
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                  <span className="sr-only">Descendre {titreDe(index)}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => demanderRetrait(index)}
                  className="cursor-pointer rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="sr-only">Retirer {titreDe(index)}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {titres?.[0]?.title ? (
              <>
                Cette œuvre est d&apos;un seul tenant. Son unique mouvement
                porte le titre{" "}
                <span className="text-foreground">{titres[0].title}</span>.
              </>
            ) : (
              <>
                Cette œuvre est d&apos;un seul tenant. Son unique mouvement
                reprendra le titre de l&apos;œuvre.
              </>
            )}
          </p>

          {titreSuiviLOeuvre ? null : (
            <p className="flex flex-col items-start gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
              <span>
                Ce titre diffère de celui de l&apos;œuvre, il ne le suit donc
                pas. Rien ne sera écrasé sans votre accord.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reprendreLeTitre}
                className="cursor-pointer rounded-full"
              >
                Reprendre le titre de l&apos;œuvre
              </Button>
            </p>
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={decouper}
              className="cursor-pointer rounded-full"
            >
              <Scissors className="size-4" aria-hidden="true" />
              Découper en mouvements
            </Button>
          </div>
        </div>
      )}

      {erreur ? (
        <p role="alert" className="text-xs text-destructive">
          {erreur}
        </p>
      ) : null}

      {aRetirer !== null ? (
        <ConfirmationRetrait
          title={titreDe(aRetirer)}
          onCancel={() => setARetirer(null)}
          onConfirm={() => {
            const index = aRetirer;
            setARetirer(null);
            retirer(index);
          }}
        />
      ) : null}
    </Section>
  );
}
