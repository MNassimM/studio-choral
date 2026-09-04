"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  type FieldPath,
  type Resolver,
} from "react-hook-form";

import {
  WorkAudioSection,
  type StoredTrackMeta,
} from "@/components/admin/work-form-audio";
import { SectionAVenir } from "@/components/admin/work-form-fields";
import { WorkMovementsSection } from "@/components/admin/work-form-movements";
import { WorkMusicSection } from "@/components/admin/work-form-music";
import { WorkPricesSection } from "@/components/admin/work-form-prices";
import { WorkPublishButtons } from "@/components/admin/work-publish-buttons";
import { WorkVoicesSection } from "@/components/admin/work-form-voices";
import { WorkTextsSection } from "@/components/admin/work-form-texts";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VoiceOption } from "@/lib/admin/voice-options";
import { Link } from "@/i18n/navigation";
import type {
  WorkActionResult,
  WorkFormDraft,
} from "@/lib/admin/work-form-draft";
import {
  workFormSchema,
  type WorkFormValues,
} from "@/lib/admin/work-form-schema";
import { slugify } from "@/lib/admin/work-products";
import { cn } from "@/lib/utils";

/**
 * Formulaire d'oeuvre, partagé par la création et la modification.
 */

/**
 * Formulaire complet d'une oeuvre.
 *
 * @param mode - Création ou modification, ce qui change la règle de slug.
 * @param initialValues - Valeurs de départ, brouillon vide en création.
 * @param voices - Les pupitres de la base, chargés par la page serveur.
 * @param storedMeta - Nom, taille et format des pistes déjà enregistrées.
 * @param submitAction - Action serveur appelée à la soumission.
 * @param submitLabel - Texte du bouton d'enregistrement.
 * @param publication - Actions de publication, absentes en création.
 * @returns Le formulaire rendu.
 */
export function WorkForm({
  mode,
  initialValues,
  voices,
  storedMeta = {},
  submitAction,
  submitLabel = "Enregistrer le brouillon",
  publication,
}: {
  mode: "create" | "edit";
  initialValues: WorkFormDraft;
  voices: VoiceOption[];
  storedMeta?: StoredTrackMeta;
  submitAction: (values: WorkFormValues) => Promise<WorkActionResult>;
  submitLabel?: string;
  /** Absent en création : il n'y a rien à publier tant que rien n'existe. */
  publication?: {
    workId: string;
    isPublished: boolean;
    onPublish: (workId: string) => Promise<WorkActionResult>;
    onUnpublish: (workId: string) => Promise<WorkActionResult>;
  };
}) {
  const form = useForm<WorkFormDraft, unknown, WorkFormValues>({
    // Le brouillon porte une clé par mouvement que le schéma ignore et retire
    // à la validation, d'où ce cast plutôt qu'une règle zod de plus.
    resolver: zodResolver(workFormSchema) as unknown as Resolver<
      WorkFormDraft,
      unknown,
      WorkFormValues
    >,
    defaultValues: initialValues,
  });

  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);
  // Un envoi audio en cours interdit l'enregistrement, le brouillon citerait
  // un fichier que R2 n'a pas encore reçu.
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [titreSuiviLOeuvre, setTitreSuiviLOeuvre] = useState(
    !(
      mode === "edit" &&
      initialValues.movements.length === 1 &&
      initialValues.movements[0].title !== initialValues.title
    ),
  );

  // Un slug cesse de suivre son titre dès que quelqu'un y touche, et en
  // modification il ne bouge jamais tout seul, sous peine de casser les liens.
  const slugFige = useRef(mode === "edit");
  const slugAnglaisFige = useRef(mode === "edit");

  /** Réaligne le mouvement unique sur le titre de l'oeuvre. */
  function reprendreLeTitre() {
    setTitreSuiviLOeuvre(true);
    form.setValue("movements.0.title", form.getValues("title"), {
      shouldValidate: false,
      shouldDirty: true,
    });
  }

  /** Recalcule les deux slugs tant qu'ils suivent encore leur titre. */
  function suivreLesTitres(titreFr: string, titreEn: string | null) {
    const slugFr = slugFige.current ? form.getValues("slug") : slugify(titreFr);
    if (!slugFige.current) {
      form.setValue("slug", slugFr, { shouldValidate: false });
    }
    if (!slugAnglaisFige.current) {
      // Sans titre anglais, cas des incipits, le slug anglais reprend le français.
      form.setValue(
        "translations.en.slug",
        titreEn ? slugify(titreEn) : slugFr,
        {
          shouldValidate: false,
        },
      );
    }

    // Un seul mouvement, il porte le titre de l'oeuvre.
    if (titreSuiviLOeuvre && form.getValues("movements").length === 1) {
      form.setValue("movements.0.title", titreFr, {
        shouldValidate: false,
        shouldDirty: true,
      });
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setErreurGlobale(null);
    const result = await submitAction(values);
    if (result.ok) {
      // Les valeurs enregistrées deviennent la nouvelle référence, le
      // formulaire redevient vierge et la publication se rouvre.
      form.reset(form.getValues());
      return;
    }

    // Le serveur revalide tout et peut refuser ce que le client croyait bon.
    if (result.field) {
      form.setError(result.field as FieldPath<WorkFormDraft>, {
        type: "server",
        message: result.error,
      });
      form.setFocus(result.field as FieldPath<WorkFormDraft>);
    } else {
      setErreurGlobale(result.error);
    }
  });

  const enCours = form.formState.isSubmitting;
  // On ne compare rien avec la base, react-hook-form sait seul si l'admin a
  // touché à quelque chose depuis le chargement.
  const modifie = form.formState.isDirty;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              Administration · Œuvres ·{" "}
              {mode === "create" ? "Nouvelle" : "Modifier"}
            </p>
            <h1 className="font-serif text-3xl tracking-tight">
              {mode === "create"
                ? "Créer une nouvelle œuvre"
                : "Modifier l'œuvre"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/works"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "rounded-full",
              )}
            >
              Annuler
            </Link>
            {publication ? (
              <WorkPublishButtons
                workId={publication.workId}
                isPublished={publication.isPublished}
                disabled={modifie || enCours || envoiEnCours}
                onPublish={publication.onPublish}
                onUnpublish={publication.onUnpublish}
                onError={setErreurGlobale}
              />
            ) : null}
            <Button
              type="submit"
              size="lg"
              disabled={!modifie || enCours || envoiEnCours}
              title={modifie ? undefined : "Aucune modification à enregistrer."}
              className="rounded-full"
            >
              {enCours ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {enCours ? "Enregistrement..." : submitLabel}
            </Button>
          </div>
        </div>

        {erreurGlobale ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {erreurGlobale}
          </p>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <WorkTextsSection
              mode={mode}
              suivreLesTitres={suivreLesTitres}
              figerSlug={() => {
                slugFige.current = true;
              }}
              figerSlugAnglais={() => {
                slugAnglaisFige.current = true;
              }}
            />

            <WorkMusicSection />

            {/* Emplacement de l'éditeur de mouvements, prompt suivant. */}
            <WorkMovementsSection
              titreSuiviLOeuvre={titreSuiviLOeuvre}
              reprendreLeTitre={reprendreLeTitre}
            />

            <WorkAudioSection
              voices={voices}
              storedMeta={storedMeta}
              onBusyChange={setEnvoiEnCours}
            />
          </div>

          <aside className="flex flex-col gap-6">
            {/* Emplacement de l'image de couverture, prompt suivant. */}
            <SectionAVenir
              title="Image de couverture"
              note="Le dépôt d'image arrive bientot !!!!"
            />

            <WorkVoicesSection
              voices={voices}
              initialVoiceCodes={initialValues.voiceCodes}
            />

            <WorkPricesSection />
          </aside>
        </div>
      </form>
    </FormProvider>
  );
}
