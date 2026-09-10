"use client";

import { useWatch } from "react-hook-form";

import {
  Champ,
  Section,
  useWorkForm,
} from "@/components/admin/work-form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkFormDraft } from "@/lib/admin/form/work-form-draft";

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

/**
 * Compositeur, période, effectif, langue chantée et accompagnement.
 *
 * @returns La section.
 */
export function WorkMusicSection() {
  const form = useWorkForm();
  const control = form.control;

  const periode = useWatch({ control, name: "period" });
  const langue = useWatch({ control, name: "language" });
  const accompagnement = useWatch({ control, name: "hasAccompaniment" });

  return (
    <Section title="Informations musicales">
      <div className="grid gap-4 md:grid-cols-2">
        <Champ label="Compositeur" name="composer" required>
          {(aria) => (
            <Input
              {...aria}
              placeholder="Ex : Clément Janequin"
              {...form.register("composer")}
            />
          )}
        </Champ>

        <Champ label="Période" name="period">
          {(aria) => (
            <Select
              value={periode}
              onValueChange={(value) =>
                form.setValue("period", value as WorkFormDraft["period"], {
                  shouldValidate: true,
                  shouldDirty: true,
                })
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

        <Champ label="Langue du texte" name="language">
          {(aria) => (
            <Select
              value={langue}
              onValueChange={(value) =>
                form.setValue("language", value as WorkFormDraft["language"], {
                  shouldValidate: true,
                  shouldDirty: true,
                })
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

        <Champ label="Référence" name="catalogueRef">
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
        <Champ label="Année de composition" name="composedYear">
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
              form.setValue("hasAccompaniment", checked === true, {
                shouldDirty: true,
              })
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
  );
}
