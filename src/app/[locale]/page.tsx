import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Playfair_Display } from "next/font/google";
import { ChevronRight, Compass, Music2, Repeat, Search } from "lucide-react";

import { Container } from "@/components/layout/container";
import { WorkCard } from "@/components/catalog/work-card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import {
  buildWorkCardInclude,
  deriveWorkCardData,
} from "@/lib/catalog/work-card-data";

// Police serif locale à cette page, pour les grands titres éditoriaux — le
// reste du site (Header, Footer, composants partagés) reste en Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

const steps = [
  { icon: Compass, key: "stepBrowse" },
  { icon: Repeat, key: "stepListen" },
  { icon: Music2, key: "stepSing" },
] as const;

async function Hero() {
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-6 py-20 text-center sm:py-28">
        <h1
          className={cn(
            "max-w-2xl text-4xl tracking-tight text-balance sm:text-5xl",
            playfairDisplay.className,
          )}
        >
          {t("heroTitle")}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("heroDescription")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full px-6",
            )}
          >
            {t("viewCatalogue")}
          </Link>
          <Link
            href="/comment-ca-marche"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
          >
            {tNav("howItWorks")}
          </Link>
        </div>
      </Container>
    </section>
  );
}

async function SearchBar({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("home");
  const action = getPathname({ href: "/catalogue", locale });

  return (
    <section className="bg-background">
      <Container className="pb-16 sm:pb-20">
        <form
          action={action}
          method="GET"
          className="relative mx-auto w-full max-w-2xl"
        >
          <button
            type="submit"
            aria-label={t("searchAriaLabel")}
            className="absolute top-1/2 left-5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <Input
            type="search"
            name="q"
            placeholder={t("searchPlaceholder")}
            className="h-14 rounded-full border-border pl-12 text-base"
          />
        </form>
      </Container>
    </section>
  );
}

async function HowItWorksSection() {
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  return (
    <section className="bg-background max-w-7xl mx-auto">
      <Container className="pb-20 sm:pb-28">
        <div className="rounded-2xl border border-border bg-secondary/40 p-8 sm:p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              {t("howItWorksEyebrow")}
            </span>
            <Separator className="w-12" />
          </div>

          <div className="mt-10 grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {steps.map(({ icon: Icon, key }, index) => (
              <Fragment key={key}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background text-primary">
                    <Icon className="size-6" />
                  </div>
                  <p className="font-medium">{t(`${key}Label`)}</p>
                  <p className="max-w-56 text-sm text-muted-foreground">
                    {t(`${key}Description`)}
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
              {tCommon("learnMore")}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

async function FeaturedWorksSection({
  works,
}: {
  works: ReturnType<typeof deriveWorkCardData>[];
}) {
  if (works.length === 0) {
    return null;
  }

  const t = await getTranslations("home");

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
          {t("viewFullCatalogue")}
        </Link>
      </Container>
    </section>
  );
}

export default async function Home() {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;

  const works = await prisma.work.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    take: 3,
    include: buildWorkCardInclude(locale),
  });
  const featuredWorks = works.map((work) => deriveWorkCardData(work, locale));

  return (
    <>
      <Hero />
      <SearchBar locale={locale} />
      <HowItWorksSection />
      <FeaturedWorksSection works={featuredWorks} />
    </>
  );
}
