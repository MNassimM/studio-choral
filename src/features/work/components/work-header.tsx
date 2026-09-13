import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Playfair_Display } from "next/font/google";
import { Music2 } from "lucide-react";

import { isKnownWorkLanguageCode } from "@/features/work/domain/work-language";
import type { WorkWithDetail } from "@/features/work/server/published-work";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { coverUrl } from "@/server/storage/cover-url";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * En-tête de la page œuvre : visuel et informations.
 *
 * @param work - Œuvre publiée.
 * @param title - Titre résolu dans la locale active.
 * @param description - Description résolue, ou null.
 * @returns L'en-tête rendu.
 */
async function WorkHeader({
  work,
  title,
  description,
}: {
  work: WorkWithDetail;
  title: string;
  description: string | null;
}) {
  const t = await getTranslations("work");

  function translateWorkLanguage(code: string): string {
    return isKnownWorkLanguageCode(code) ? t(`language.${code}`) : code;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:items-start">
      {work.coverImageKey ? (
        <div className=" bg-gradient-to-b from-primary to-primary/60 p-[2px] rounded-2xl">
          <div className="relative aspect-square overflow-hidden rounded-2xl">
            <Image
              src={coverUrl(work.coverImageKey)}
              alt=""
              fill
              sizes="(min-width: 1024px) 24rem, 100vw"
              className="object-cover rounded-2xl"
              priority
            />
          </div>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-secondary text-primary"
        >
          <Music2 className="size-12" />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end text-end gap-2 items-baseline">
          <h1
            className={cn(
              "text-3xl tracking-tight sm:text-4xl",
              playfairDisplay.className,
            )}
          >
            {title}
          </h1>
          {work.catalogueRef ? (
            <Badge className="text-xl p-3" variant="outlineSecondary">
              {work.catalogueRef}
            </Badge>
          ) : null}
        </div>
        <p className="text-lg text-muted-foreground">{work.composer}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {work.period ? (
            <Badge variant="outlineSecondary">
              {t(`period.${work.period}`)}
            </Badge>
          ) : null}
          {work.voicing ? (
            <Badge variant="secondary">{work.voicing}</Badge>
          ) : null}
          {work.language ? (
            <Badge variant="secondary">
              {translateWorkLanguage(work.language)}
            </Badge>
          ) : null}
          {work.movements.length > 1 ? (
            <Badge variant="secondary">
              {t("card.movementsCount", { count: work.movements.length })}
            </Badge>
          ) : null}
        </div>

        {description ? (
          <p className="max-w-3xl text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export { WorkHeader };
