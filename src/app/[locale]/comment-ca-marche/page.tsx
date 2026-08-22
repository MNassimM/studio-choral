import { Fragment } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Playfair_Display } from "next/font/google";
import {
  AudioWaveform,
  BarChart3,
  BookOpen,
  ChevronRight,
  CreditCard,
  Download,
  Headphones,
  Headset,
  Heart,
  Infinity as InfinityIcon,
  Lock,
  Music2,
  RefreshCw,
  ShoppingCart,
  SlidersVertical,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Police serif locale à cette page, pour les grands titres éditoriaux - le
// reste du site (Header, Footer, composants partagés) reste en Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

// Union explicite (pas juste `string`) : nécessaire pour que
// `${messageKey}Title`/`${messageKey}Description` restent des littéraux de
// type vérifiables par next-intl plutôt qu'un `string` générique élargi.
type FeatureMessageKey =
  | "browseCatalog"
  | "listenExtracts"
  | "chooseOffer"
  | "checkout"
  | "findWorks"
  | "downloadFiles"
  | "listenOnline"
  | "customize"
  | "workEfficiently"
  | "progress"
  | "pleasure"
  | "secureAccess"
  | "unlimitedDownloads"
  | "updatesIncluded"
  | "needHelp";

type FeatureItem = {
  icon: LucideIcon;
  // Nommé messageKey (pas "key") : un champ "key" serait intercepté par React
  // à la place d'être transmis comme prop lors du spread {...item} en JSX.
  messageKey: FeatureMessageKey;
};

const CHOOSE_WORK_STEPS: FeatureItem[] = [
  { icon: BookOpen, messageKey: "browseCatalog" },
  { icon: Headphones, messageKey: "listenExtracts" },
  { icon: ShoppingCart, messageKey: "chooseOffer" },
  { icon: CreditCard, messageKey: "checkout" },
];

const LIBRARY_FEATURES: FeatureItem[] = [
  { icon: Music2, messageKey: "findWorks" },
  { icon: Download, messageKey: "downloadFiles" },
  { icon: Headphones, messageKey: "listenOnline" },
];

const PRACTICE_FEATURES: FeatureItem[] = [
  { icon: SlidersVertical, messageKey: "customize" },
  { icon: AudioWaveform, messageKey: "workEfficiently" },
  { icon: BarChart3, messageKey: "progress" },
  { icon: Heart, messageKey: "pleasure" },
];

const TRUST_ITEMS: FeatureItem[] = [
  { icon: Lock, messageKey: "secureAccess" },
  { icon: InfinityIcon, messageKey: "unlimitedDownloads" },
  { icon: RefreshCw, messageKey: "updatesIncluded" },
  { icon: Headset, messageKey: "needHelp" },
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const t = await getTranslations("howItWorks");

  const languages = Object.fromEntries(
    routing.locales.map((l) => [
      l,
      getPathname({ href: "/comment-ca-marche", locale: l }),
    ]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ href: "/comment-ca-marche", locale }),
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
  };
}

// Trait décoratif fin - volontairement un simple div plutôt que le composant
// Separator partagé : celui-ci impose data-horizontal:w-full avec la même
// spécificité qu'un override d'instance (ex. w-12), donc une largeur réduite
// ne le bat jamais de façon fiable. Purement ornemental ici (pas de rôle
// separator ARIA à porter), donc aria-hidden.
function OrnamentalRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("h-px w-12 bg-border", className)} />
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="text-xs font-semibold tracking-[0.3em] text-primary uppercase">
        {children}
      </h2>
      <OrnamentalRule />
    </div>
  );
}

type HowItWorksTranslator = Awaited<
  ReturnType<typeof getTranslations<"howItWorks">>
>;

function StepCircleItem({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-medium">{t(`${messageKey}Title`)}</h3>
      <p className="max-w-56 text-sm text-muted-foreground">
        {t(`${messageKey}Description`)}
      </p>
    </div>
  );
}

async function ChooseWorkSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-10 py-16 sm:py-20">
        <SectionHeading>{t("section1Heading")}</SectionHeading>
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          {CHOOSE_WORK_STEPS.map((step, index) => (
            <Fragment key={step.messageKey}>
              <StepCircleItem {...step} t={t} />
              {index < CHOOSE_WORK_STEPS.length - 1 ? (
                <ChevronRight
                  className="mt-5 hidden size-5 shrink-0 text-muted-foreground md:block"
                  aria-hidden="true"
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      </Container>
    </section>
  );
}

function LibraryFeatureRow({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{t(`${messageKey}Title`)}</h3>
        <p className="text-sm text-muted-foreground">
          {t(`${messageKey}Description`)}
        </p>
      </div>
    </div>
  );
}

async function LibrarySection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-secondary/30">
      <Container className="py-16 sm:py-20">
        <SectionHeading>{t("section2Heading")}</SectionHeading>
        <div className="mt-10 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div
            className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-background"
            role="img"
            aria-label={t("libraryImageAlt")}
          >
            {/* TODO : remplacer par une capture réelle de la bibliothèque */}
            <Music2
              className="size-12 text-muted-foreground/50"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col gap-8">
            {LIBRARY_FEATURES.map((feature) => (
              <LibraryFeatureRow key={feature.messageKey} {...feature} t={t} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function PracticeFeatureItem({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Icon className="size-6 text-primary" aria-hidden="true" />
      <h3 className="font-medium">{t(`${messageKey}Title`)}</h3>
      <p className="max-w-56 text-sm text-muted-foreground">
        {t(`${messageKey}Description`)}
      </p>
    </div>
  );
}

async function PracticeSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-10 py-16 sm:py-20">
        <SectionHeading>{t("section3Heading")}</SectionHeading>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {PRACTICE_FEATURES.map((feature) => (
            <PracticeFeatureItem key={feature.messageKey} {...feature} t={t} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function TrustItem({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{t(`${messageKey}Title`)}</h3>
        <p className="text-xs text-muted-foreground">
          {t(`${messageKey}Description`)}
        </p>
      </div>
    </div>
  );
}

async function TrustSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="border border-border bg-secondary/30">
      <Container className="py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <TrustItem key={item.messageKey} {...item} t={t} />
          ))}
        </div>
      </Container>
    </section>
  );
}

async function CtaSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-background">
      <Container className="py-16 sm:py-20">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col gap-2">
            <h2
              className={cn(
                "text-2xl tracking-tight",
                playfairDisplay.className,
              )}
            >
              {t("ctaTitle")}
            </h2>
            <p className="text-muted-foreground">{t("ctaDescription")}</p>
          </div>
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ size: "lg" }),
              "shrink-0 gap-1.5 rounded-full px-6",
            )}
          >
            {t("ctaButton")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

export default async function CommentCaMarchePage() {
  const t = await getTranslations("howItWorks");
  const tCommon = await getTranslations("common");

  return (
    <>
      <section className="max-w-7xl mx-auto bg-background">
        <Container className="flex flex-col gap-8 pt-2 sm:pt-6">
          <nav
            aria-label={tCommon("breadcrumbAriaLabel")}
            className="text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary">
              {tCommon("breadcrumbHome")}
            </Link>
            <span className="mx-2">-{">"}</span>
            <span aria-current="page" className="text-foreground">
              {t("breadcrumbCurrent")}
            </span>
          </nav>
        </Container>
      </section>
      <section className="bg-background">
        <Container className="flex flex-col items-center gap-4 py-16 text-center sm:py-20">
          <h1
            className={cn(
              "text-4xl tracking-tight sm:text-5xl",
              playfairDisplay.className,
            )}
          >
            {t("heroTitle")}
          </h1>
          <OrnamentalRule />
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            {t("heroDescription")}
          </p>
        </Container>
      </section>
      <div className="max-w-7xl mx-auto">
        <ChooseWorkSection />
        <LibrarySection />
        <PracticeSection />
        <TrustSection />
        <CtaSection />
      </div>
    </>
  );
}
