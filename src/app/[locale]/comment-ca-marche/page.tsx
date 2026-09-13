import { Fragment } from "react";
import type { Metadata } from "next";
import Image from "next/image";
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

import library from "@/assets/library.png";
import { Container } from "@/shared/components/site/container";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/shared/utils/cn";

// Police serif propre à cette page, pour ses grands titres éditoriaux. Le
// reste du site garde Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Clés de message des blocs illustrés de la page.
 *
 * @remarks
 * Union explicite plutôt qu'une chaîne libre, pour que les clés composées en
 * Title et en Description restent vérifiables par next-intl.
 */
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

/**
 * Bloc illustré de la page, associant une icône à ses clés de message.
 *
 * @remarks
 * Le champ est nommé messageKey et non key, un champ key étant intercepté par
 * React au lieu d'être transmis comme prop lors de la diffusion en JSX.
 */
type FeatureItem = {
  icon: LucideIcon;
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

/**
 * Construit les métadonnées de la page de présentation.
 *
 * @returns Le titre, la description et les liens alternatifs par locale.
 */
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
/**
 * Trait décoratif court, purement ornemental.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le trait rendu.
 */
function OrnamentalRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("h-px w-12 bg-border", className)} />
  );
}

/**
 * Titre de section, souligné de son trait décoratif.
 *
 * @param children - Intitulé de la section.
 * @returns Le titre rendu.
 */
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

/**
 * Étape du parcours d'achat, avec son icône en pastille ronde.
 *
 * @param icon - Icône de l'étape.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns L'étape rendue.
 */
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

/**
 * Section du parcours d'achat, en quatre étapes chaînées.
 *
 * @returns La section rendue.
 */
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

/**
 * Ligne décrivant une possibilité de la bibliothèque.
 *
 * @param icon - Icône de la possibilité.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns La ligne rendue.
 */
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

/**
 * Section présentant la bibliothèque personnelle.
 *
 * @returns La section rendue.
 */
async function LibrarySection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-secondary/30">
      <Container className="py-16 sm:py-20">
        <SectionHeading>{t("section2Heading")}</SectionHeading>
        <div className="mt-10 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          {/* Importée depuis src/ et non servie depuis public/ : Next lit
              alors ses dimensions à la compilation, réserve la place avant le
              chargement, et fabrique lui même le flou d'attente. */}
          <Image
            src={library}
            alt={t("libraryImageAlt")}
            placeholder="blur"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full rounded-xl border-2 border-primary/50"
          />
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

/**
 * Élément décrivant un usage du studio de répétition.
 *
 * @param icon - Icône de l'usage.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns L'élément rendu.
 */
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

/**
 * Section présentant le travail au studio.
 *
 * @returns La section rendue.
 */
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

/**
 * Élément de réassurance, en format compact.
 *
 * @param icon - Icône de l'élément.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns L'élément rendu.
 */
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

/**
 * Bandeau des garanties offertes aux acheteurs.
 *
 * @returns La section rendue.
 */
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

/**
 * Encart d'appel à l'action vers le catalogue.
 *
 * @returns La section rendue.
 */
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

/**
 * Page expliquant le fonctionnement du service.
 *
 * @remarks
 * Page éditoriale sans accès à la base. Tout son contenu vient du namespace
 * de traduction howItWorks.
 *
 * @returns La page rendue.
 */
export default async function HowItWorksPage() {
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
            <Link href="/" className="hover:text-primary !underline">
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
