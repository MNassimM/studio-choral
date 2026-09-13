"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Container } from "@/shared/components/site/container";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Filet de sécurité des pages d'une locale.
 *
 * @param error - L'erreur interceptée, avec son empreinte quand Next en pose une.
 * @param reset - Rejoue le rendu du segment, sans recharger la page.
 * @returns La page d'erreur rendue.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.unexpected");

  useEffect(() => {
    console.error("[locale] rendu interrompu", error);
  }, [error]);

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-4 py-24 text-center sm:py-32">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-md text-muted-foreground">{t("description")}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            size="lg"
            onClick={reset}
            className="cursor-pointer rounded-full px-6"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t("retry")}
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full px-6",
            )}
          >
            {t("backHome")}
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {t("reference")} : {error.digest}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
