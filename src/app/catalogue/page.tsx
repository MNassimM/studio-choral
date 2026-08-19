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
import { CatalogComposerFilter } from "@/components/catalog/catalog-composer-filter";
import {
  PeriodSelect,
  SortSelect,
} from "@/components/catalog/catalog-controls";
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
  const period: PeriodValue =
    typeof rawSearchParams.period === "string" &&
    isPeriodValue(rawSearchParams.period)
      ? rawSearchParams.period
      : "all";
  const view: "grid" | "list" =
    rawSearchParams.view === "list" ? "list" : "grid";
  const composer =
    typeof rawSearchParams.composer === "string" &&
    rawSearchParams.composer.length > 0
      ? rawSearchParams.composer
      : null;

  // Récupération des œuvres publiées et des compositeurs distincts côté serveur
  const [allWorks, worksCount, distinctComposerRows] = await Promise.all([
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
  ]);

  const composers = distinctComposerRows
    .map((row) => row.composer)
    .sort((a, b) => a.localeCompare(b, "fr"));

  let entries = allWorks.map((work) => ({
    cardData: deriveWorkCardData(work),
    createdAt: work.createdAt,
  }));

  // Filtrage par compositeur
  if (composer) {
    entries = entries.filter((entry) => entry.cardData.composer === composer);
  }

  if (q) {
    const needle = q.toLowerCase();
    entries = entries.filter(
      (entry) =>
        entry.cardData.title.toLowerCase().includes(needle) ||
        entry.cardData.composer.toLowerCase().includes(needle),
    );
  }

  // period === "all" : aucun filtrage, les œuvres sans period restent
  // visibles. Sinon, comparaison directe à cardData.period — une œuvre dont
  // period est null n'égale jamais une valeur d'enum et disparaît donc de
  // tout filtre de période précis, sans cas particulier à coder.
  if (period !== "all") {
    entries = entries.filter((entry) => entry.cardData.period === period);
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

          {/* Formulaire de recherche, filtres et bascule grille/tableau */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CatalogSearchForm
                q={q}
                sort={sort}
                period={period}
                view={view}
                composer={composer}
              />
              <div className="flex flex-wrap items-center gap-2">
                <SortSelect value={sort} />
                <PeriodSelect value={period} />
                <CatalogViewToggle
                  view={view}
                  currentParams={rawSearchParams}
                />
              </div>
            </div>

            <CatalogComposerFilter
              composers={composers}
              active={composer}
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
