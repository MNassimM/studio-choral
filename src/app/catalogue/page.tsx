import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Info,
  Music2,
  Users2,
} from "lucide-react";

// Import de composants partagés
import { Container } from "@/components/layout/container";
import { WorkCard } from "@/components/catalog/work-card";
import { WorkTableRow } from "@/components/catalog/work-table-row";
import { CatalogSearchForm } from "@/components/catalog/catalog-search-form";
import {
  CatalogActiveFilters,
  type ActiveFilterPill,
} from "@/components/catalog/catalog-active-filters";
import {
  CatalogFiltersButton,
  CatalogFiltersPanel,
  type FilterCategory,
} from "@/components/catalog/catalog-filters";
import { SortSelect } from "@/components/catalog/catalog-controls";
import {
  PERIOD_OPTIONS,
  type PeriodValue,
  SORT_OPTIONS,
  type SortValue,
} from "@/components/catalog/catalog-options";
import { CatalogViewToggle } from "@/components/catalog/catalog-view-toggle";
import { Button, buttonVariants } from "@/components/ui/button";

// Import de fonctions utilitaires
import { prisma } from "@/lib/db/prisma";
import {
  deriveWorkCardData,
  workCardInclude,
} from "@/lib/catalog/work-card-data";
import { getLanguageLabel } from "@/lib/works/languages";
import { cn } from "@/lib/utils";

// Page publique, peu volatile : ISR toutes les heures. Les searchParams
// (recherche, tri, filtre) forcent de toute façon un rendu dynamique par
// requête — cette valeur s'appliquera si la page devient un jour cacheable
// indépendamment de ses paramètres (ex. contenu au-dessus du fil coupé du
// reste via une future limite de streaming).
export const revalidate = 3600;

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Catalogue - Butterfly Studio Choral",
    description:
      "Parcourez le catalogue de partitions et de pistes de répétition par pupitre de Butterfly Studio Choral.",
    alternates: { canonical: "/catalogue" },
  };
}

// Type guards pour valider les searchParams côté serveur
function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function isPeriodValue(value: string): value is PeriodValue {
  return PERIOD_OPTIONS.some((option) => option.value === value);
}

/**
 * Parse un paramètre multi-valeur au format "A,B,C". Chaque valeur est
 * validée indépendamment via `isValid` ; une valeur inconnue est ignorée
 * silencieusement (jamais d'erreur) — une URL entièrement invalide retombe
 * simplement sur "aucun filtre de cette catégorie".
 */
function parseMultiValueParam<T extends string>(
  raw: unknown,
  isValid: (value: string) => value is T,
): T[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  const values: T[] = [];
  const seen = new Set<string>();
  for (const token of raw.split(",")) {
    const trimmed = token.trim();
    if (trimmed && !seen.has(trimmed) && isValid(trimmed)) {
      seen.add(trimmed);
      values.push(trimmed);
    }
  }
  return values;
}

function StatBox({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export default async function CataloguePage(props: PageProps<"/catalogue">) {
  const rawSearchParams = await props.searchParams;
  // Extraction et validation des searchParams côté serveur
  const q =
    typeof rawSearchParams.q === "string" ? rawSearchParams.q.trim() : "";
  const sort: SortValue =
    typeof rawSearchParams.sort === "string" &&
    isSortValue(rawSearchParams.sort)
      ? rawSearchParams.sort
      : "featured";
  const view: "grid" | "list" =
    rawSearchParams.view === "list" ? "list" : "grid";

  // Œuvres publiées, compositeurs distincts (stat "Compositeurs") et valeurs
  // distinctes de period/voicing/language (options du panneau de filtres) —
  // toujours calculées depuis la base, jamais écrites en dur.
  const [
    allWorks,
    worksCount,
    distinctComposerRows,
    distinctPeriodRows,
    distinctVoicingRows,
    distinctLanguageRows,
  ] = await Promise.all([
    prisma.work.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "asc" },
      include: workCardInclude,
    }),
    prisma.work.count({ where: { isPublished: true } }),
    prisma.work.findMany({
      where: { isPublished: true },
      distinct: ["composer"],
      select: { composer: true },
    }),
    prisma.work.findMany({
      where: { isPublished: true, period: { not: null } },
      distinct: ["period"],
      select: { period: true },
    }),
    prisma.work.findMany({
      where: { isPublished: true, voicing: { not: null } },
      distinct: ["voicing"],
      select: { voicing: true },
    }),
    prisma.work.findMany({
      where: { isPublished: true, language: { not: null } },
      distinct: ["language"],
      select: { language: true },
    }),
  ]);

  const composers = distinctComposerRows
    .map((row) => row.composer)
    .sort((a, b) => a.localeCompare(b, "fr"));

  const availablePeriodValues = new Set(
    distinctPeriodRows.map((row) => row.period),
  );
  // Ordre chronologique (celui de PERIOD_OPTIONS), pas l'ordre d'arrivée en base.
  const availablePeriods = PERIOD_OPTIONS.filter((option) =>
    availablePeriodValues.has(option.value),
  );
  const availableVoicings = distinctVoicingRows
    .map((row) => row.voicing!)
    .sort((a, b) => a.localeCompare(b, "fr"));
  const availableLanguages = distinctLanguageRows
    .map((row) => row.language!)
    .sort((a, b) =>
      getLanguageLabel(a).localeCompare(getLanguageLabel(b), "fr"),
    );

  // Une catégorie sans valeur disponible n'est pas affichée dans le panneau.
  const filterCategories: FilterCategory[] = [];
  if (availablePeriods.length > 0) {
    filterCategories.push({
      key: "period",
      label: "Période",
      options: availablePeriods.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    });
  }
  if (availableVoicings.length > 0) {
    filterCategories.push({
      key: "voicing",
      label: "Formation",
      options: availableVoicings.map((voicing) => ({
        value: voicing,
        label: voicing,
      })),
    });
  }
  if (availableLanguages.length > 0) {
    filterCategories.push({
      key: "language",
      label: "Langue",
      options: availableLanguages.map((language) => ({
        value: language,
        label: getLanguageLabel(language),
      })),
    });
  }

  // period : validé contre l'enum MusicalPeriod. voicing/language : validés
  // contre les valeurs réellement présentes en base (calculées ci-dessus) —
  // dans les deux cas, un token inconnu est ignoré silencieusement.
  const periods = parseMultiValueParam(rawSearchParams.period, isPeriodValue);
  const voicings = parseMultiValueParam(
    rawSearchParams.voicing,
    (value): value is string => availableVoicings.includes(value),
  );
  const languages = parseMultiValueParam(
    rawSearchParams.language,
    (value): value is string => availableLanguages.includes(value),
  );

  let entries = allWorks.map((work) => ({
    cardData: deriveWorkCardData(work),
    createdAt: work.createdAt,
  }));

  if (q) {
    const needle = q.toLowerCase();
    entries = entries.filter(
      (entry) =>
        entry.cardData.title.toLowerCase().includes(needle) ||
        entry.cardData.composer.toLowerCase().includes(needle),
    );
  }

  // OU à l'intérieur d'une catégorie, ET entre catégories : trois filtres
  // indépendants appliqués en série plutôt qu'une condition combinée.
  if (periods.length > 0) {
    entries = entries.filter(
      (entry) =>
        entry.cardData.period !== null &&
        periods.includes(entry.cardData.period),
    );
  }
  if (voicings.length > 0) {
    entries = entries.filter(
      (entry) =>
        entry.cardData.voicing !== null &&
        voicings.includes(entry.cardData.voicing),
    );
  }
  if (languages.length > 0) {
    entries = entries.filter(
      (entry) =>
        entry.cardData.language !== null &&
        languages.includes(entry.cardData.language),
    );
  }

  entries = [...entries].sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return (
          (a.cardData.fromPriceCents ?? Infinity) -
          (b.cardData.fromPriceCents ?? Infinity)
        );
      case "price-desc":
        return (
          (b.cardData.fromPriceCents ?? -Infinity) -
          (a.cardData.fromPriceCents ?? -Infinity)
        );
      case "title-asc":
        return a.cardData.title.localeCompare(b.cardData.title, "fr");
      case "composer-asc":
        return a.cardData.composer.localeCompare(b.cardData.composer, "fr");
      default:
        return a.createdAt.getTime() - b.createdAt.getTime();
    }
  });

  // Oeuvres filtrées et triées, prêtes à être affichées dans la vue choisie (grille ou tableau)
  const works = entries.map((entry) => entry.cardData);

  const activeFilterPills: ActiveFilterPill[] = [
    ...periods.map((value) => ({
      categoryKey: "period" as const,
      categoryLabel: "Période",
      value,
      label: PERIOD_OPTIONS.find((option) => option.value === value)!.label,
    })),
    ...voicings.map((value) => ({
      categoryKey: "voicing" as const,
      categoryLabel: "Formation",
      value,
      label: value,
    })),
    ...languages.map((value) => ({
      categoryKey: "language" as const,
      categoryLabel: "Langue",
      value,
      label: getLanguageLabel(value),
    })),
  ];

  return (
    <>
      <section className="max-w-7xl mx-auto bg-background">
        <Container className="flex flex-col gap-8 pb-12 sm:pb-16 pt-2 sm:pt-6">
          <nav
            aria-label="Fil d'Ariane"
            className="text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary">
              Accueil
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page" className="text-foreground">
              Catalogue
            </span>
          </nav>

          <div className="flex flex-col gap-3">
            <h1
              className={cn(
                "text-3xl tracking-tight sm:text-4xl",
                playfairDisplay.className,
              )}
            >
              Catalogue
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Parcourez nos œuvres, écoutez un aperçu gratuit et choisissez le
              mouvement ou le pupitre qui vous intéresse.
            </p>
          </div>

          {/* Statistiques globales du catalogue, avant filtrage */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox
              icon={BookOpen}
              value={String(worksCount)}
              label="Œuvres disponibles"
            />
            <StatBox
              icon={Users2}
              value={String(composers.length)}
              label="Compositeurs"
            />
            <StatBox icon={Music2} value="SATB" label="Formation disponible" />
            <StatBox
              icon={Headphones}
              value="Pistes audio"
              label="Incluses à l'achat"
            />
          </div>

          {/* Recherche, filtres (panneau) et bascule grille/tableau */}
          <div className="flex flex-col gap-4">
            <CatalogFiltersPanel
              key={[...periods, ...voicings, ...languages].join("|")}
              categories={filterCategories}
              activePeriods={periods}
              activeVoicings={voicings}
              activeLanguages={languages}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CatalogSearchForm
                  q={q}
                  sort={sort}
                  periods={periods}
                  voicings={voicings}
                  languages={languages}
                  view={view}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <SortSelect value={sort} />
                  {filterCategories.length > 0 ? (
                    <CatalogFiltersButton />
                  ) : null}
                  <CatalogViewToggle
                    view={view}
                    currentParams={rawSearchParams}
                  />
                </div>
              </div>
            </CatalogFiltersPanel>

            <CatalogActiveFilters
              pills={activeFilterPills}
              currentParams={rawSearchParams}
            />
          </div>

          {works.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              Aucune œuvre ne correspond à votre recherche.
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {works.map((work) => (
                <WorkCard key={work.slug} work={work} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/40 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 pr-4 pl-4 font-medium">Visuel</th>
                    <th className="py-3 pr-4 font-medium">Titre</th>
                    <th className="py-3 pr-4 font-medium">Compositeur</th>
                    <th className="py-3 pr-4 font-medium">Effectif</th>
                    <th className="py-3 pr-4 font-medium">Mouvements</th>
                    <th className="py-3 pr-4 font-medium">Prix</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {works.map((work) => (
                    <WorkTableRow key={work.slug} work={work} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {works.length}{" "}
              {works.length > 1 ? "œuvres affichées" : "œuvre affichée"}
            </p>
            {/* TODO : pagination non nécessaire pour l'instant — une seule
                page (4 œuvres au catalogue). Emplacement réservé, une seule
                page réelle : précédent/suivant désactivés. */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled
                aria-label="Page précédente"
                className="rounded-full"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span
                aria-current="page"
                className={cn(
                  buttonVariants({ size: "icon" }),
                  "pointer-events-none rounded-full",
                )}
              >
                1
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled
                aria-label="Page suivante"
                className="rounded-full"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-secondary/30">
        <Container className="py-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <Info
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                Chaque œuvre est disponible par mouvement ou en intégralité,
                pour un seul pupitre ou pour l&apos;ensemble des voix. Après
                votre achat, retrouvez vos pistes audio dans votre bibliothèque
                personnelle.
              </p>
            </div>
            <Link
              href="/comment-ca-marche"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 rounded-full",
              )}
            >
              En savoir plus
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
