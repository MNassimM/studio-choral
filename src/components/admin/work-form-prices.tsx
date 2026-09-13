"use client";

import { useEffect } from "react";
import { useWatch } from "react-hook-form";

import {
  Field,
  Section,
  useWorkForm,
} from "@/components/admin/work-form-fields";
import { Input } from "@/components/ui/input";
import { derivePrices } from "@/lib/admin/form/work-form-schema";

/**
 * Les prix catalogue.
 */

/** Les quatre lignes, dans l'ordre d'affichage. */
const CHAMPS = [
  ["prices.movementSingleVoice", "1 voix · 1 mouvement"],
  ["prices.movementAllVoices", "Toutes voix · 1 mouvement"],
  ["prices.workSingleVoice", "1 voix · œuvre entière"],
  ["prices.workAllVoices", "Toutes voix · œuvre entière"],
] as const;

/** Une ligne de tarif, saisissable ou déduite. */
function PriceRow({
  name,
  label,
  readOnly,
}: {
  name: (typeof CHAMPS)[number][0];
  label: string;
  readOnly: boolean;
}) {
  const form = useWorkForm();

  return (
    <Field
      label={label}
      name={name}
      hint={readOnly ? "déduit" : undefined}
      required={!readOnly}
    >
      {(aria) => (
        <span className="flex items-center gap-1.5">
          <Input
            {...aria}
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            readOnly={readOnly}
            tabIndex={readOnly ? -1 : undefined}
            className="h-8 w-24 text-right tabular-nums read-only:border-transparent read-only:bg-secondary/60 read-only:text-muted-foreground"
            {...form.register(name, {
              setValueAs: (value) =>
                value === "" || value === null ? null : Number(value),
            })}
          />
          <span aria-hidden="true" className="text-sm text-muted-foreground">
            €
          </span>
        </span>
      )}
    </Field>
  );
}

/**
 * Les tarifs de l'oeuvre, un seul champ saisissable.
 *
 * @returns La section rendue.
 */
export function WorkPricesSection() {
  const form = useWorkForm();
  const control = form.control;

  const movements = useWatch({ control, name: "movements" }) ?? [];
  const voiceCodes = useWatch({ control, name: "voiceCodes" }) ?? [];
  const prices = useWatch({ control, name: "prices" });

  const plusieurs = movements.length > 1;
  // La source change de champ selon le découpage de l'oeuvre.
  const source = plusieurs
    ? (prices?.movementSingleVoice ?? null)
    : (prices?.workSingleVoice ?? null);

  const derives = derivePrices(source, voiceCodes.length, movements.length);

  useEffect(() => {
    for (const [name] of CHAMPS) {
      const clef = name.split(".")[1] as keyof typeof derives;
      if (plusieurs && clef === "movementSingleVoice") continue;
      if (!plusieurs && clef === "workSingleVoice") continue;
      const attendu = derives[clef];
      if (prices?.[clef] !== attendu) {
        form.setValue(name, attendu, {
          shouldValidate: false,
          shouldDirty: true,
        });
      }
    }
  }, [derives, prices, plusieurs, form]);

  const visibles = CHAMPS.filter(
    ([name]) => plusieurs || !name.startsWith("prices.movement"),
  );

  return (
    <Section title="Tarification">
      <p className="-mt-2 text-xs text-muted-foreground">
        {plusieurs
          ? "Saisissez le prix d'une voix sur un mouvement, le reste en découle."
          : "Saisissez le prix d'une voix, le pack toutes voix en découle."}
      </p>

      {voiceCodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Retenez au moins un pupitre pour calculer les tarifs.
        </p>
      ) : null}

      {visibles.map(([name, label]) => (
        <PriceRow
          key={name}
          name={name}
          label={label}
          readOnly={
            plusieurs
              ? name !== "prices.movementSingleVoice"
              : name !== "prices.workSingleVoice"
          }
        />
      ))}
    </Section>
  );
}
