"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldPath,
  type Resolver,
} from "react-hook-form";

import {
  WorkAudioSection,
  type StoredTrackMeta,
} from "@/features/admin/works/components/audio-matrix/work-form-audio";
import { WorkCoverSection } from "@/features/admin/works/components/work-form-cover";
import { WorkMovementsSection } from "@/features/admin/works/components/work-form-movements";
import { WorkMusicSection } from "@/features/admin/works/components/work-form-music";
import { WorkPricesSection } from "@/features/admin/works/components/work-form-prices";
import { WorkPublishButtons } from "@/features/admin/works/components/work-publish-buttons";
import { WorkVoicesSection } from "@/features/admin/works/components/work-form-voices";
import { WorkTextsSection } from "@/features/admin/works/components/work-form-texts";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import type { VoiceOption } from "@/features/admin/works/form/voice-options";
import { Link } from "@/i18n/navigation";
import type {
  WorkActionResult,
  WorkFormDraft,
} from "@/features/admin/works/form/work-form-draft";
import {
  workFormSchema,
  type WorkFormValues,
} from "@/features/admin/works/form/work-form-schema";
import { expectedTrackCount } from "@/features/admin/works/domain/track-coverage";
import { slugify } from "@/features/admin/works/server/work-products";
import { cn } from "@/shared/utils/cn";

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
  coverPreviewUrl = null,
  submitAction,
  submitLabel = "Enregistrer le brouillon",
  publication,
}: {
  mode: "create" | "edit";
  initialValues: WorkFormDraft;
  voices: VoiceOption[];
  storedMeta?: StoredTrackMeta;
  /** URL de la couverture deja enregistree, absente en creation. */
  coverPreviewUrl?: string | null;
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
  function restoreWorkTitle() {
    setTitreSuiviLOeuvre(true);
    form.setValue("movements.0.title", form.getValues("title"), {
      shouldValidate: false,
      shouldDirty: true,
    });
  }

  /** Recalcule les deux slugs tant qu'ils suivent encore leur titre. */
  function syncSlugsWithTitles(titreFr: string, titreEn: string | null) {
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

  // Une oeuvre est complète quand toutes les cases de la matrice sont
  // remplies
  const control = form.control;
  const mouvements = useWatch({ control, name: "movements" }) ?? [];
  const pupitres = useWatch({ control, name: "voiceCodes" }) ?? [];
  const pistes = useWatch({ control, name: "tracks" }) ?? [];
  const accompagnement = useWatch({ control, name: "hasAccompaniment" });
  const attendues = expectedTrackCount({
    movementCount: mouvements.length,
    voiceCount: pupitres.length,
    hasAccompaniment: Boolean(accompagnement),
  });
  const incomplete = attendues === 0 || pistes.length < attendues;
  const depubliera = Boolean(publication?.isPublished) && incomplete;

  const enCours = form.formState.isSubmitting;
  const modifie = form.formState.isDirty;

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <nav className="text-sm text-muted-foreground">
              <Link href="/admin" className="hover:text-primary !underline">
                Administration
              </Link>
              <span className="mx-2">-{">"}</span>
              <Link
                href="/admin/works"
                className="hover:text-primary !underline"
              >
                Liste des œuvres
              </Link>
              <span className="mx-2">-{">"}</span>
              <span aria-current="page" className="text-foreground">
                {mode === "create" ? "Nouvelle" : "Modifier"} œuvre
              </span>
            </nav>
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

        {depubliera ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Il manque {Math.max(0, attendues - pistes.length)} piste
              {attendues - pistes.length > 1 ? "s" : ""} sur {attendues} pour
              que toutes les offres soient vendables.{" "}
              <span className="text-foreground">
                Enregistrer dans cet état dépubliera cette œuvre
              </span>
              , elle ne sera plus accessible aux personnes ne l&apos;ayant pas
              achetée.
            </span>
          </p>
        ) : null}

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
              suivreLesTitres={syncSlugsWithTitles}
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
              reprendreLeTitre={restoreWorkTitle}
            />

            <WorkAudioSection
              voices={voices}
              storedMeta={storedMeta}
              onBusyChange={setEnvoiEnCours}
            />
          </div>

          <aside className="flex flex-col gap-6">
            <WorkCoverSection previewUrl={coverPreviewUrl} />

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
