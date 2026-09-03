"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useState } from "react";
import { useWatch } from "react-hook-form";

import {
  Champ,
  Section,
  useWorkForm,
} from "@/components/admin/work-form-fields";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Les textes de l'oeuvre, en français et en anglais.
 *
 * @param mode - Création ou modification, ce qui change l'aide du slug.
 * @param suivreLesTitres - Recalcul des deux slugs
 * @param figerSlug - Coupe le suivi du slug français dès qu'on y touche.
 * @param figerSlugAnglais - Idem pour le slug anglais.
 * @returns La section rendue.
 */
export function WorkTextsSection({
  mode,
  suivreLesTitres,
  figerSlug,
  figerSlugAnglais,
}: {
  mode: "create" | "edit";
  suivreLesTitres: (titreFr: string, titreEn: string | null) => void;
  figerSlug: () => void;
  figerSlugAnglais: () => void;
}) {
  const form = useWorkForm();
  const control = form.control;

  const [tab, setTab] = useState<"fr" | "en">("fr");

  const titreAnglais = useWatch({ control, name: "translations.en.title" });
  const accrocheAnglaise = useWatch({
    control,
    name: "translations.en.shortDescription",
  });
  const descriptionAnglaise = useWatch({
    control,
    name: "translations.en.description",
  });

  const anglaisVide =
    !titreAnglais && !accrocheAnglaise && !descriptionAnglaise;

  return (
    <Section
      title="Textes"
      action={
        <Tabs.Root
          value={tab}
          onValueChange={(value) => setTab(value as "fr" | "en")}
        >
          <Tabs.List className="flex gap-2" aria-label="Langue des textes">
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
                <Badge variant="outline" className="border-border text-xs">
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
          <Champ label="Titre" name="title" required>
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
                    figerSlug();
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
                    figerSlugAnglais();
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

          <Champ label="Description" name="translations.en.description">
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
  );
}
