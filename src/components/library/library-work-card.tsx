import { getFormatter, getTranslations } from "next-intl/server";
import { CheckCircle2, Music2 } from "lucide-react";
import { Playfair_Display } from "next/font/google";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LibraryWorkDetails } from "@/components/library/library-work-details";
import { Link } from "@/i18n/navigation";
import type { LibraryWorkRow } from "@/lib/library/library-rows";
import { isKnownWorkLanguageCode } from "@/lib/works/work-language";
import { cn } from "@/lib/utils";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Une oeuvre de la bibliothèque : son accès, ses pupitres, ses fichiers.
 *
 * @param row - Ligne déjà résolue.
 * @param returnTo - Chemin où revenir après connexion.
 * @returns La carte rendue.
 */
async function LibraryWorkCard({
  row,
  returnTo,
}: {
  row: LibraryWorkRow;
  returnTo: string;
}) {
  const t = await getTranslations("library");
  const tWork = await getTranslations("work");
  const format = await getFormatter();

  const dateAjout = format.dateTime(row.addedAt, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Un mouvement unique porte le titre de l'oeuvre : la colonne le répéterait.
  const mouvementUnique = row.coverage.length === 1;

  return (
    <article className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"
          aria-hidden="true"
        >
          {/* TODO coverImageKey est vide : même emplacement réservé que les
              cartes du catalogue. */}
          <Music2 className="size-7" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2
            className={cn(
              "flex flex-wrap items-center gap-2 text-xl",
              playfairDisplay.className,
            )}
          >
            <Link
              href={{ pathname: "/works/[slug]", params: { slug: row.slug } }}
              className="hover:text-primary"
            >
              {row.title}
            </Link>
            {row.catalogueRef ? (
              <Badge variant="outline">{row.catalogueRef}</Badge>
            ) : null}
          </h2>
          <p className="text-sm text-muted-foreground">{row.composer}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {row.period ? (
              <Badge variant="secondary">
                {tWork(`period.${row.period}` as "period.CLASSICAL")}
              </Badge>
            ) : null}
            {row.voicing ? (
              <Badge variant="secondary">{row.voicing}</Badge>
            ) : null}
            {row.language && isKnownWorkLanguageCode(row.language) ? (
              <Badge variant="secondary">
                {tWork(`language.${row.language}` as "language.fr")}
              </Badge>
            ) : null}
            {row.movementCount > 1 ? (
              <Badge variant="secondary">
                {tWork("card.movementsCount", { count: row.movementCount })}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              row.ownsFullWork
                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                : "text-foreground ring-1 ring-border",
            )}
          >
            {row.ownsFullWork ? (
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
            ) : null}
            {row.ownsFullWork
              ? t("accessFull")
              : t("accessVoices", { voices: row.ownedVoiceLabels.join(", ") })}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.purchased
              ? t("addedPurchased", { date: dateAjout })
              : t("addedGranted", { date: dateAjout })}
          </span>
          <Link
            href={{ pathname: "/works/[slug]", params: { slug: row.slug } }}
            className={cn(buttonVariants({ size: "sm" }), "rounded-full")}
          >
            {t("workLink")}
          </Link>
        </div>
      </div>

      <LibraryWorkDetails workId={row.workId} returnTo={returnTo}>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("coverageHeading")}
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th scope="col" className="sr-only">
                  {t("coverageMovementColumn")}
                </th>
                {(row.coverage[0]?.cells ?? []).map((cell) => (
                  <th
                    key={cell.code}
                    scope="col"
                    title={cell.label}
                    className="pb-1.5 text-center font-medium text-muted-foreground"
                  >
                    {cell.label.slice(0, 1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {row.coverage.map((mouvement) => (
                <tr key={mouvement.movementId}>
                  <td className="py-1 pr-3 whitespace-nowrap">
                    {mouvementUnique ? row.title : mouvement.movementTitle}
                  </td>
                  {mouvement.cells.map((cell) => (
                    <td key={cell.code} className="py-1 text-center">
                      <span
                        className={cn(
                          "inline-block size-2.5 rounded-full align-middle",
                          cell.owned
                            ? "bg-primary"
                            : "ring-1 ring-border ring-inset",
                        )}
                      />
                      <span className="sr-only">
                        {cell.label} :{" "}
                        {cell.owned ? t("voiceOwned") : t("voiceLocked")}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="flex gap-3 text-[0.7rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full bg-primary"
                aria-hidden="true"
              />
              {t("legendOwned")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full ring-1 ring-border ring-inset"
                aria-hidden="true"
              />
              {t("legendLocked")}
            </span>
          </p>
        </div>
      </LibraryWorkDetails>
    </article>
  );
}

export { LibraryWorkCard };
