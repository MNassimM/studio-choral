import {
  AlertCircle,
  Check,
  Music2,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { computeTrackCoverage } from "@/lib/admin/sellability/track-coverage";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";

// Dépend du rôle et montre des brouillons, donc jamais de cache.
export const dynamic = "force-dynamic";

/** Les trois filtres de la barre, tels qu'ils passent dans l'URL. */
type StatusFilter = "all" | "published" | "draft";

/** Lit le filtre depuis l'URL, en retombant sur toutes les oeuvres. */
function parseStatus(value: string | undefined): StatusFilter {
  return value === "published" || value === "draft" ? value : "all";
}

/** Formate une date en jour court, ou aujourd'hui si c'est le cas. */
function formatDate(date: Date): string {
  const aujourdhui = new Date();
  const memeJour =
    date.getFullYear() === aujourdhui.getFullYear() &&
    date.getMonth() === aujourdhui.getMonth() &&
    date.getDate() === aujourdhui.getDate();

  if (memeJour) return "aujourd'hui";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Barre d'avancement des pistes, doublée d'un texte qui suffit seul. */
function TrackProgress({
  imported,
  expected,
  missing,
  ratio,
  state,
}: ReturnType<typeof computeTrackCoverage>) {
  const couleur =
    state === "complete"
      ? "bg-primary"
      : state === "partial"
        ? "bg-primary/50"
        : "bg-transparent";

  const texte =
    state === "empty"
      ? "aucune piste importée"
      : state === "complete"
        ? `${imported} sur ${expected}`
        : `${imported} sur ${expected} · ${missing} manquantes`;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuenow={imported}
        aria-valuemin={0}
        aria-valuemax={expected}
        aria-label={`Pistes audio : ${texte}`}
        className="h-1 w-full overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn("h-full rounded-full", couleur)}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs",
          state === "empty" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {texte}
      </span>
    </div>
  );
}

/** Pastille de statut, le mot suffit sans la couleur. */
function StatusBadge({ published }: { published: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        published
          ? "border-public text-public bg-public-background"
          : "border-primary/50 text-primary",
      )}
    >
      {published ? "Publiée" : "Brouillon"}
    </Badge>
  );
}

/** Marque l'état de la traduction anglaise, avec un titre lisible. */
function TranslationState({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Check className="size-4" aria-hidden="true" />
      <span className="sr-only">Traduction anglaise complète</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-destructive">
      <X className="size-4" aria-hidden="true" />
      <span className="sr-only">Traduction anglaise absente</span>
    </span>
  );
}

/**
 * Liste des oeuvres en administration, brouillons compris.
 */
export default async function AdminWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = parseStatus(params.statut);

  // Une requête pour les oeuvres, une pour les pistes. Jamais une par oeuvre.
  const works = await prisma.work.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      composer: true,
      catalogueRef: true,
      isPublished: true,
      hasAccompaniment: true,
      updatedAt: true,
      movements: { select: { id: true } },
      translations: { where: { locale: "en" }, select: { id: true } },
      products: {
        where: { voiceId: { not: null }, isActive: true },
        select: { voiceId: true },
        distinct: ["voiceId"],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const trackCounts = await prisma.audioFile.groupBy({
    by: ["movementId"],
    _count: { _all: true },
  });
  const tracksByMovement = new Map(
    trackCounts.map((row) => [row.movementId, row._count._all]),
  );

  const rows = works.map((work) => {
    const imported = work.movements.reduce(
      (total, movement) => total + (tracksByMovement.get(movement.id) ?? 0),
      0,
    );
    return {
      ...work,
      movementCount: work.movements.length,
      translated: work.translations.length > 0,
      coverage: computeTrackCoverage(
        {
          movementCount: work.movements.length,
          voiceCount: work.products.length,
          hasAccompaniment: work.hasAccompaniment,
        },
        imported,
      ),
    };
  });

  const counts = {
    all: rows.length,
    published: rows.filter((row) => row.isPublished).length,
    draft: rows.filter((row) => !row.isPublished).length,
  };

  const normalise = (value: string) =>
    value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const besoin = normalise(query);

  const visible = rows.filter((row) => {
    if (status === "published" && !row.isPublished) return false;
    if (status === "draft" && row.isPublished) return false;
    if (besoin.length === 0) return true;
    return (
      normalise(row.title).includes(besoin) ||
      normalise(row.composer).includes(besoin)
    );
  });

  const filtres: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Toutes", count: counts.all },
    { key: "published", label: "Publiées", count: counts.published },
    { key: "draft", label: "Brouillons", count: counts.draft },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl tracking-tight">Catalogue</h1>
        {/* La page de création n'existe pas encore, le lien est volontairement mort. */}
        <Link
          href="/admin/works/new"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nouvelle œuvre
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            aria-label="Rechercher une œuvre"
            placeholder="Rechercher un titre ou un compositeur"
            className="h-10 rounded-full pl-9"
          />
        </div>
        <input type="hidden" name="statut" value={status} />
        <div className="flex flex-wrap gap-2">
          {filtres.map((filtre) => (
            <Link
              key={filtre.key}
              href={{
                pathname: "/admin/works",
                query: {
                  ...(query ? { q: query } : {}),
                  ...(filtre.key === "all" ? {} : { statut: filtre.key }),
                },
              }}
              aria-current={status === filtre.key ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "gap-2 rounded-full",
                status === filtre.key &&
                  "border-primary/40 bg-primary/15 text-primary",
              )}
            >
              {filtre.label}
              <span className="text-muted-foreground">{filtre.count}</span>
            </Link>
          ))}
        </div>
      </form>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border py-16 text-center">
          <Music2 className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">
            {counts.all === 0 ? "Aucune œuvre au catalogue" : "Aucun résultat"}
          </p>
          <p className="text-sm text-muted-foreground">
            {counts.all === 0
              ? "Commencez par créer une première œuvre."
              : "Essayez un autre titre ou un autre compositeur."}
          </p>
        </div>
      ) : (
        <div className="relative min-w-0 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-3xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-3 font-medium">
                  Œuvre
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Mouvements
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Pistes audio
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium">
                  Traduction
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Modifiée
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((row) => (
                <tr key={row.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary"
                      >
                        <Music2 className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{row.title}</span>
                          <StatusBadge published={row.isPublished} />
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.composer}
                          {row.catalogueRef ? ` · ${row.catalogueRef}` : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {row.movementCount}
                  </td>
                  <td className="w-80 px-4 py-3">
                    <TrackProgress {...row.coverage} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TranslationState complete={row.translated} />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatDate(row.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* La page de modification n'existe pas encore. */}
                    <Link
                      href={{
                        pathname: "/admin/works/[id]",
                        params: { id: row.id },
                      }}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {counts.draft > 0 ? (
          <AlertCircle className="size-3.5" aria-hidden="true" />
        ) : null}
        {counts.all} œuvre{counts.all > 1 ? "s" : ""}
        {counts.draft > 0
          ? ` · ${counts.draft} brouillon${counts.draft > 1 ? "s" : ""} en attente de publication`
          : ""}
      </p>
    </div>
  );
}
