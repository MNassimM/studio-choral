"use client";

import { ChampPrix, Section } from "@/components/admin/work-form-fields";

/**
 * Les quatre prix catalogue, saisis en euros.
 *
 * @returns La section rendue.
 */
export function WorkPricesSection() {
  return (
    <Section title="Tarification">
      <p className="-mt-2 text-xs text-muted-foreground">
        En euros. Les remises sont calculées automatiquement.
      </p>
      <ChampPrix
        label="1 voix · 1 mouvement"
        name="prices.movementSingleVoice"
      />
      <ChampPrix
        label="Toutes voix · 1 mouvement"
        name="prices.movementAllVoices"
      />
      <ChampPrix label="1 voix · œuvre entière" name="prices.workSingleVoice" />
      <ChampPrix
        label="Toutes voix · œuvre entière"
        name="prices.workAllVoices"
      />
    </Section>
  );
}
