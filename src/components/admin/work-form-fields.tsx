"use client";

import { useId } from "react";
import {
  useFormContext,
  type FieldPath,
  type UseFormReturn,
} from "react-hook-form";

import type { WorkFormDraft } from "@/lib/admin/work-form-draft";
import type { WorkFormValues } from "@/lib/admin/work-form-schema";

/**
 * Briques communes aux sections du formulaire d'oeuvre.
 */

/** Le formulaire d'oeuvre, avec ses trois génériques. */
export type Form = UseFormReturn<WorkFormDraft, unknown, WorkFormValues>;

/**
 * Lit le formulaire posé par WorkForm.
 *
 * @returns Le formulaire courant, typé.
 */
export function useWorkForm(): Form {
  return useFormContext<WorkFormDraft, unknown, WorkFormValues>();
}

/**
 * Enveloppe un champ avec son libellé et son message d'erreur.
 */
function Champ({
  label,
  name,
  required,
  hint,
  children,
}: {
  label: string;
  name: FieldPath<WorkFormDraft>;
  required?: boolean;
  hint?: string;
  children: (aria: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const form = useWorkForm();
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
      {/* L'indication vit HORS du libellé : dedans, elle entrerait dans le
          nom accessible du champ tout en étant déjà pointée par
          aria-describedby, et serait donc annoncée deux fois. */}
      <span className="flex items-baseline text-sm">
        <label htmlFor={controlId}>
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="ml-1 text-primary">
                *
              </span>
              <span className="sr-only"> (obligatoire)</span>
            </>
          ) : null}
        </label>
        {hint ? (
          <span id={hintId} className="ml-2 text-xs text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>

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

export { Champ, Section, SectionAVenir };
