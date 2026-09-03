"use client";

import { Tabs } from "@base-ui/react/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  useForm,
  useWatch,
  type FieldPath,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import {
  workFormSchema,
  type WorkFormValues,
} from "@/lib/admin/work-form-schema";
import type {
  WorkActionResult,
  WorkFormDraft,
} from "@/lib/admin/work-form-draft";
import { slugify } from "@/lib/admin/work-products";
import { cn } from "@/lib/utils";

/**
 * Formulaire d'oeuvre, partagé par la création et la modification.
 */

/** Libellés français des périodes, dans l'ordre chronologique. */
const PERIODES = [
  ["MEDIEVAL", "Médiéval"],
  ["RENAISSANCE", "Renaissance"],
  ["BAROQUE", "Baroque"],
  ["CLASSICAL", "Classique"],
  ["ROMANTIC", "Romantique"],
  ["MODERN", "Moderne"],
  ["CONTEMPORARY", "Contemporain"],
] as const;

/** Les seules langues chantées qui disposent d'un libellé traduit. */
const LANGUES = [
  ["la", "Latin"],
  ["fr", "Français"],
  ["de", "Allemand"],
  ["en", "Anglais"],
  ["it", "Italien"],
] as const;

/** Effectifs proposés, la saisie libre restant possible. */
const EFFECTIFS = [
  "SATB",
  "SATB div.",
  "SAB",
  "SSA",
  "SSAA",
  "TTBB",
  "TB",
  "unisson",
] as const;

type Form = UseFormReturn<WorkFormDraft, unknown, WorkFormValues>;

/**
 * Enveloppe un champ avec son libellé et son message d'erreur.
 */
function Champ({
  label,
  name,
  form,
  required,
  hint,
  children,
}: {
  label: string;
  name: FieldPath<WorkFormDraft>;
  form: Form;
  required?: boolean;
  hint?: string;
  children: (aria: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const auto = useId();
  const controlId = `${auto}-control`;
  const errorId = `${auto}-error`;
  const hintId = `${auto}-hint`;

  const erreur = name
    .split(".")
    .reduce<unknown>(
      (noeud, part) =>
        noeud && typeof noeud === "object"
          ? (noeud as Record<string, unknown>)[part]
          : undefined,
      form.formState.errors,
    ) as { message?: string } | undefined;
  const message = erreur?.message;

  const describedBy =
    [message ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-sm">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-primary">
              *
            </span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        ) : null}
        {hint ? (
          <span id={hintId} className="ml-2 text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </label>

      {children({
        id: controlId,
        "aria-invalid": Boolean(message),
        "aria-describedby": describedBy,
      })}

      {message ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Un bloc encadré, reprenant la mise en page de la maquette. */
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Emplacement d'une section à venir, pour tenir la mise en page.
 */
function SectionAVenir({
  title,
  note,
  error,
}: {
  title: string;
  note: string;
  error?: string;
}) {
  return (
    <Section title={title}>
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {note}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </Section>
  );
}

/** Champ de prix en euros, vide valant absence de prix. */
function ChampPrix({
  label,
  name,
  form,
}: {
  label: string;
  name:
    | "prices.movementSingleVoice"
    | "prices.movementAllVoices"
    | "prices.workSingleVoice"
    | "prices.workAllVoices";
  form: Form;
}) {
  return (
    <Champ label={label} name={name} form={form}>
      {(aria) => (
        <Input
          {...aria}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          {...form.register(name, {
            setValueAs: (value) =>
              value === "" || value === null ? null : Number(value),
          })}
        />
      )}
    </Champ>
  );
}

/**
 * Formulaire complet d'une oeuvre.
 *
 * @param mode - Création ou modification, ce qui change la règle de slug.
 * @param initialValues - Valeurs de départ, brouillon vide en création.
 * @param submitAction - Action serveur appelée à la soumission.
 * @param submitLabel - Texte du bouton d'enregistrement.
 * @returns Le formulaire rendu.
 */
export function WorkForm({
  mode,
  initialValues,
  submitAction,
  submitLabel = "Enregistrer le brouillon",
}: {
  mode: "create" | "edit";
  initialValues: WorkFormDraft;
  submitAction: (values: WorkFormValues) => Promise<WorkActionResult>;
  submitLabel?: string;
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

  const [tab, setTab] = useState<"fr" | "en">("fr");
  const [erreurGlobale, setErreurGlobale] = useState<string | null>(null);

  // Un slug cesse de suivre son titre dès que quelqu'un y touche, et en
  // modification il ne bouge jamais tout seul, sous peine de casser les liens.
  const slugFige = useRef(mode === "edit");
  const slugAnglaisFige = useRef(mode === "edit");

  const control = form.control;
  const titreAnglais = useWatch({ control, name: "translations.en.title" });
  const accrocheAnglaise = useWatch({
    control,
    name: "translations.en.shortDescription",
  });
  const descriptionAnglaise = useWatch({
    control,
    name: "translations.en.description",
  });
  const periode = useWatch({ control, name: "period" });
  const langue = useWatch({ control, name: "language" });
  const accompagnement = useWatch({ control, name: "hasAccompaniment" });

  const anglaisVide =
    !titreAnglais && !accrocheAnglaise && !descriptionAnglaise;

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
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setErreurGlobale(null);
    const result = await submitAction(values);
    if (result.ok) return;

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

  return (
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
            className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}
          >
            Annuler
          </Link>
          <Button
            type="submit"
            size="lg"
            disabled={enCours}
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
          <Section
            title="Textes"
            action={
              <Tabs.Root
                value={tab}
                onValueChange={(value) => setTab(value as "fr" | "en")}
              >
                <Tabs.List
                  className="flex gap-2"
                  aria-label="Langue des textes"
                >
                  <Tabs.Tab
                    value="fr"
                    className="cursor-pointer rounded-lg border border-transparent px-3 py-1 text-sm aria-selected:border-primary/40 aria-selected:bg-primary/15 aria-selected:text-primary"
                  >
                    Français
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="en"
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1 text-sm aria-selected:border-primary/40 aria-selected:bg-primary/15 aria-selected:text-primary"
                  >
                    English
                    {anglaisVide ? (
                      <Badge
                        variant="outline"
                        className="border-border text-xs"
                      >
                        vide
                      </Badge>
                    ) : null}
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.Root>
            }
          >
            {/* Les deux panneaux restent montés, la saisie survit au changement. */}
            <div hidden={tab !== "fr"} className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Champ label="Titre" name="title" form={form} required>
                  {(aria) => (
                    <Input
                      {...aria}
                      placeholder="Ex : Ce mois de mai"
                      {...form.register("title", {
                        onChange: (event) =>
                          suivreLesTitres(event.target.value, titreAnglais),
                      })}
                    />
                  )}
                </Champ>

                <Champ
                  label="Slug"
                  name="slug"
                  form={form}
                  required
                  hint={
                    mode === "edit"
                      ? "le modifier casse les liens existants"
                      : "généré depuis le titre"
                  }
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      {...form.register("slug", {
                        onChange: () => {
                          slugFige.current = true;
                        },
                      })}
                    />
                  )}
                </Champ>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Champ
                  label="Accroche"
                  name="shortDescription"
                  form={form}
                  required
                >
                  {(aria) => (
                    <Textarea
                      {...aria}
                      placeholder="Une œuvre poétique pour chœur mixte."
                      {...form.register("shortDescription")}
                    />
                  )}
                </Champ>

                <Champ
                  label="Description"
                  name="description"
                  form={form}
                  required
                >
                  {(aria) => (
                    <Textarea
                      {...aria}
                      placeholder="Contexte, style, particularités..."
                      {...form.register("description")}
                    />
                  )}
                </Champ>
              </div>
            </div>

            <div hidden={tab !== "en"} className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">
                Facultatif à la création. Ces textes ne seront exigés que pour
                publier.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Champ
                  label="Title"
                  name="translations.en.title"
                  form={form}
                  hint="vide si le titre ne se traduit pas"
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      {...form.register("translations.en.title", {
                        setValueAs: (value) => (value === "" ? null : value),
                        onChange: (event) =>
                          suivreLesTitres(
                            form.getValues("title"),
                            event.target.value,
                          ),
                      })}
                    />
                  )}
                </Champ>

                <Champ
                  label="Slug"
                  name="translations.en.slug"
                  form={form}
                  required
                  hint={
                    mode === "edit"
                      ? "le modifier casse les liens existants"
                      : "généré depuis le titre anglais"
                  }
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      {...form.register("translations.en.slug", {
                        onChange: () => {
                          slugAnglaisFige.current = true;
                        },
                      })}
                    />
                  )}
                </Champ>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Champ
                  label="Short description"
                  name="translations.en.shortDescription"
                  form={form}
                >
                  {(aria) => (
                    <Textarea
                      {...aria}
                      {...form.register("translations.en.shortDescription", {
                        setValueAs: (value) => (value === "" ? null : value),
                      })}
                    />
                  )}
                </Champ>

                <Champ
                  label="Description"
                  name="translations.en.description"
                  form={form}
                >
                  {(aria) => (
                    <Textarea
                      {...aria}
                      {...form.register("translations.en.description", {
                        setValueAs: (value) => (value === "" ? null : value),
                      })}
                    />
                  )}
                </Champ>
              </div>
            </div>
          </Section>

          <Section title="Informations musicales">
            <div className="grid gap-4 md:grid-cols-2">
              <Champ label="Compositeur" name="composer" form={form} required>
                {(aria) => (
                  <Input
                    {...aria}
                    placeholder="Ex : Clément Janequin"
                    {...form.register("composer")}
                  />
                )}
              </Champ>

              <Champ label="Période" name="period" form={form}>
                {(aria) => (
                  <Select
                    value={periode}
                    onValueChange={(value) =>
                      form.setValue(
                        "period",
                        value as WorkFormDraft["period"],
                        {
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <SelectTrigger {...aria} className="w-full">
                      <SelectValue placeholder="Sélectionner">
                        {(value: string | null) =>
                          PERIODES.find(([code]) => code === value)?.[1] ??
                          "Sélectionner"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODES.map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Champ>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Champ
                label="Effectif"
                name="voicing"
                form={form}
                hint="saisie libre"
              >
                {(aria) => (
                  <Input
                    {...aria}
                    list="effectifs-courants"
                    placeholder="Ex : SATB"
                    {...form.register("voicing", {
                      setValueAs: (value) =>
                        value === "" || value === null ? null : value,
                    })}
                  />
                )}
              </Champ>

              <Champ label="Langue du texte" name="language" form={form}>
                {(aria) => (
                  <Select
                    value={langue}
                    onValueChange={(value) =>
                      form.setValue(
                        "language",
                        value as WorkFormDraft["language"],
                        { shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger {...aria} className="w-full">
                      <SelectValue placeholder="Sélectionner">
                        {(value: string | null) =>
                          LANGUES.find(([code]) => code === value)?.[1] ??
                          "Sélectionner"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUES.map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Champ>

              <Champ label="Référence" name="catalogueRef" form={form}>
                {(aria) => (
                  <Input
                    {...aria}
                    placeholder="BWV 248"
                    {...form.register("catalogueRef", {
                      setValueAs: (value) =>
                        value === "" || value === null ? null : value,
                    })}
                  />
                )}
              </Champ>
            </div>

            <div className="grid items-end gap-4 md:grid-cols-2">
              <Champ
                label="Année de composition"
                name="composedYear"
                form={form}
              >
                {(aria) => (
                  <Input
                    {...aria}
                    type="number"
                    step="1"
                    placeholder="1815"
                    {...form.register("composedYear", {
                      setValueAs: (value) =>
                        value === "" || value === null ? null : Number(value),
                    })}
                  />
                )}
              </Champ>

              <label className="flex items-center gap-2.5 pb-1.5 text-sm">
                <Checkbox
                  checked={accompagnement}
                  onCheckedChange={(checked) =>
                    form.setValue("hasAccompaniment", checked === true)
                  }
                />
                Chaque mouvement a un accompagnement
              </label>
            </div>

            <datalist id="effectifs-courants">
              {EFFECTIFS.map((effectif) => (
                <option key={effectif} value={effectif} />
              ))}
            </datalist>
          </Section>

          {/* Emplacement de l'éditeur de mouvements, prompt suivant. */}
          <SectionAVenir
            title="Mouvements"
            note="L'éditeur de mouvements arrive dans un prompt séparé."
            error={form.formState.errors.movements?.message}
          />

          {/* Emplacement de la matrice audio, prompt suivant. */}
          <SectionAVenir
            title="Pistes audio"
            note="L'import et la matrice des pistes arrivent dans un prompt séparé."
          />
        </div>

        <aside className="flex flex-col gap-6">
          {/* Emplacement de l'image de couverture, prompt suivant. */}
          <SectionAVenir
            title="Image de couverture"
            note="Le dépôt d'image arrive dans un prompt séparé."
          />

          {/* Emplacement du sélecteur de pupitres, prompt suivant. */}
          <SectionAVenir
            title="Pupitres"
            note="Le sélecteur de pupitres arrive dans un prompt séparé."
            error={form.formState.errors.voiceCodes?.message}
          />

          <Section title="Tarification">
            <p className="-mt-2 text-xs text-muted-foreground">
              En euros. Les remises sont calculées automatiquement.
            </p>
            <ChampPrix
              label="1 voix · 1 mouvement"
              name="prices.movementSingleVoice"
              form={form}
            />
            <ChampPrix
              label="Toutes voix · 1 mouvement"
              name="prices.movementAllVoices"
              form={form}
            />
            <ChampPrix
              label="1 voix · œuvre entière"
              name="prices.workSingleVoice"
              form={form}
            />
            <ChampPrix
              label="Toutes voix · œuvre entière"
              name="prices.workAllVoices"
              form={form}
            />
          </Section>
        </aside>
      </div>
    </form>
  );
}
