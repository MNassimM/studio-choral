"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Filet de sécurité des pages d'administration.
 *
 * @param error - L'erreur interceptée, avec son empreinte quand Next en pose une.
 * @param reset - Rejoue le rendu du segment, sans recharger la page.
 * @returns La page d'erreur rendue.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] rendu interrompu", error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-secondary/30 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Cette page d&apos;administration n&apos;a pas pu s&apos;afficher
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Aucune modification n&apos;a été perdue en base, mais une saisie en
          cours dans un formulaire, elle, l&apos;est. Réessayez : si
          l&apos;erreur revient, la base ou le stockage sont probablement
          injoignables.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          onClick={reset}
          className="cursor-pointer rounded-full px-6"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Réessayer
        </Button>
        <Link
          href="/admin/works"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "rounded-full px-6",
          )}
        >
          Retour à la liste des œuvres
        </Link>
      </div>

      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Référence de l&apos;incident : {error.digest}
        </p>
      ) : null}
    </div>
  );
}
