import { Fragment } from "react";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { ChevronRight, Compass, Music2, Repeat, Search } from "lucide-react";

import { Container } from "@/components/layout/container";
import { WorkCard } from "@/components/catalog/work-card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import {
  deriveWorkCardData,
  workCardInclude,
} from "@/lib/catalog/work-card-data";

// Police serif locale à cette page, pour les grands titres éditoriaux — le
// reste du site (Header, Footer, composants partagés) reste en Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

const steps = [
  {
    icon: Compass,
    label: "Parcourez le catalogue",
    description:
      "Découvrez nos œuvres classées par compositeur et effectif vocal.",
  },
  {
    icon: Repeat,
    label: "Écoutez et répétez",
    description:
      "Isolez chaque pupitre pour travailler votre voix en toute autonomie.",
  },
  {
    icon: Music2,
    label: "Chantez avec assurance",
    description: "Progressez à votre rythme, seul ou avec votre chœur.",
  },
];

function Hero() {
  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <h1
          className={cn(
            "max-w-2xl text-4xl tracking-tight text-balance sm:text-5xl",
            playfairDisplay.className,
          )}
        >
          Une bibliothèque de répétition pensée pour les choristes
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Butterfly Studio Choral réunit partitions et enregistrements de
          répétition pour chaque œuvre du catalogue. Chaque pupitre, soprano,
          alto, ténor, basse, dispose de ses propres pistes, pour que chaque
          choriste puisse travailler sa voix avec précision avant de rejoindre
          l&apos;ensemble.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full px-6",
            )}
          >
            Voir catalogue
          </Link>
          <Link
            href="/comment-ca-marche"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
          >
            Comment ça marche
          </Link>
        </div>
      </Container>
    </section>
  );
}

function SearchBar() {
  return (
    <section className="bg-background">
      <Container className="pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-2xl relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          {/* TODO : recherche non implémentée */}
          <Input
            type="search"
            placeholder="Rechercher une œuvre"
            className="h-14 rounded-full border-border pl-12 text-base"
          />
        </div>
      </Container>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="bg-background">
      <Container className="pb-20 sm:pb-28">
        <div className="rounded-2xl border border-border bg-secondary/40 p-8 sm:p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              Aperçu du fonctionnement
            </span>
            <Separator className="w-12" />
          </div>

          <div className="mt-10 grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {steps.map(({ icon: Icon, label, description }, index) => (
              <Fragment key={label}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background text-primary">
                    <Icon className="size-6" />
                  </div>
                  <p className="font-medium">{label}</p>
                  <p className="max-w-56 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
                {index < steps.length - 1 ? (
                  <ChevronRight
                    className="mt-5 hidden size-5 shrink-0 text-muted-foreground md:block"
                    aria-hidden="true"
                  />
                ) : null}
              </Fragment>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/comment-ca-marche"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full",
              )}
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

function FeaturedWorksSection({
  works,
}: {
  works: ReturnType<typeof deriveWorkCardData>[];
}) {
  if (works.length === 0) {
    return null;
  }

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-12 pb-20 sm:pb-28">
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work) => (
            <WorkCard key={work.slug} work={work} variant="compact" />
          ))}
        </div>
        <Link
          href="/catalogue"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
        >
          Voir tout le catalogue
        </Link>
      </Container>
    </section>
  );
}

export default async function Home() {
  const works = await prisma.work.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    take: 3,
    include: workCardInclude,
  });
  const featuredWorks = works.map(deriveWorkCardData);

  return (
    <>
      <Hero />
      <SearchBar />
      <HowItWorksSection />
      <FeaturedWorksSection works={featuredWorks} />
    </>
  );
}
