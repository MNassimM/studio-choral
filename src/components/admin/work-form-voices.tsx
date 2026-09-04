"use client";

import { Info, Plus, X } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";

import { Section, useWorkForm } from "@/components/admin/work-form-fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VoiceOption } from "@/lib/admin/voice-options";

/**
 * Le sélecteur de pupitres de l'oeuvre.
 */

/** L'effectif proposé en raccourci, de loin le plus fréquent. */
const SATB = ["SOPRANO", "ALTO", "TENOR", "BASS"];

/**
 * Les pupitres retenus pour l'oeuvre.
 *
 * @param voices - Tous les pupitres de la base, dans l'ordre canonique.
 * @param initialVoiceCodes - Ceux déjà enregistrés, pour signaler un retrait.
 * @returns La section rendue.
 */
export function WorkVoicesSection({
  voices,
  initialVoiceCodes,
}: {
  voices: VoiceOption[];
  initialVoiceCodes: string[];
}) {
  const form = useWorkForm();
  const codes = useWatch({ control: form.control, name: "voiceCodes" }) ?? [];
  const [announcement, setAnnouncement] = useState("");

  // Rien n'enregistre voiceCodes en tableau de champs, l'erreur reste donc à
  // la racine. On lit quand même root, par symétrie avec les mouvements.
  const arrayError = form.formState.errors.voiceCodes;
  const error = arrayError?.root?.message ?? arrayError?.message;

  /** Accorde le décompte des pupitres retenus. */
  function countLabel(count: number): string {
    return `${count} pupitre${count > 1 ? "s" : ""} retenu${count > 1 ? "s" : ""}.`;
  }

  /** Le libellé d'un code, en retombant sur le code s'il est inconnu. */
  function labelOf(code: string): string {
    return voices.find((voice) => voice.code === code)?.label ?? code;
  }

  /** Les retenus, remis dans l'ordre de la table et non celui d'ajout. */
  const selected = [
    ...voices.filter((voice) => codes.includes(voice.code)),
    // Un code absent de la table resterait invisible, on le montre quand même.
    ...codes
      .filter((code) => !voices.some((voice) => voice.code === code))
      .map((code) => ({ code, label: code })),
  ];
  const available = voices.filter((voice) => !codes.includes(voice.code));

  /** Ceux qui étaient enregistrés et que l'on vient de retirer. */
  const removed = initialVoiceCodes.filter((code) => !codes.includes(code));

  /** Écrit la nouvelle liste et relance la validation du champ. */
  function write(next: string[]) {
    form.setValue("voiceCodes", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  /** Retient un pupitre de plus. */
  function add(code: string) {
    if (codes.includes(code)) return;
    write([...codes, code]);
    setAnnouncement(`${labelOf(code)} ajouté. ${countLabel(codes.length + 1)}`);
  }

  /** Retire un pupitre de la liste. */
  function removeVoice(code: string) {
    write(codes.filter((retenu) => retenu !== code));
    setAnnouncement(`${labelOf(code)} retiré. ${countLabel(codes.length - 1)}`);
  }

  /** Retient l'effectif à quatre voix d'un seul geste. */
  function selectSatb() {
    const quatre = SATB.filter((code) =>
      voices.some((voice) => voice.code === code),
    );
    write(quatre);
    setAnnouncement(`Effectif SATB retenu, ${quatre.length} pupitres.`);
  }

  return (
    <Section title="Pupitres">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {selected.length > 0 ? (
        <ul
          role="group"
          aria-label="Pupitres retenus"
          className="flex flex-wrap gap-2"
        >
          {selected.map((voice) => (
            <li key={voice.code}>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 py-0.5 pr-0.5 pl-2.5 text-sm text-primary">
                {voice.label}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVoice(voice.code)}
                  className="size-5 cursor-pointer rounded-full p-0 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  <X className="size-3" aria-hidden="true" />
                  <span className="sr-only">Retirer {voice.label}</span>
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun pupitre retenu pour l&apos;instant.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {available.length > 0 ? (
          <Select
            value={null}
            onValueChange={(value) => {
              if (typeof value === "string") add(value);
            }}
          >
            <SelectTrigger
              aria-label="Ajouter un pupitre"
              className="w-full max-w-56"
            >
              <SelectValue placeholder="Ajouter un pupitre">
                {() => "Ajouter un pupitre"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {available.map((voice) => (
                <SelectItem key={voice.code} value={voice.code}>
                  {voice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tous les pupitres sont retenus.
          </p>
        )}

        {codes.length === 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectSatb}
            className="cursor-pointer rounded-full"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            SATB
          </Button>
        ) : null}
      </div>

      {removed.length > 0 ? (
        <p className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="text-foreground">
              {removed.map(labelOf).join(", ")}
            </span>{" "}
            {removed.length > 1 ? "seront retirés" : "sera retiré"} de la vente
            à l&apos;enregistrement. Les offres correspondantes passeront en
            inactif, rien ne sera supprimé et les accès déjà accordés resteront
            valables. Les remettre annule ce changement.
          </span>
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </Section>
  );
}
