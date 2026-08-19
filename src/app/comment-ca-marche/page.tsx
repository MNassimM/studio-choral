import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { cn } from "@/lib/utils";

// Police serif locale à cette page, pour les grands titres éditoriaux — le
// reste du site (Header, Footer, composants partagés) reste en Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const CHOOSE_WORK_STEPS: FeatureItem[] = [
  {
    icon: BookOpen,
    title: "Parcourez notre catalogue",
    description:
      "Découvrez des œuvres classées par style, langue, niveau et effectif.",
  },
  {
    icon: Headphones,
    title: "Écoutez des extraits",
    description:
      "Chaque œuvre propose des extraits audio pour vous aider à faire votre choix.",
  },
  {
    icon: ShoppingCart,
    title: "Choisissez votre offre",
    description:
      "Sélectionnez la ou les voix souhaitées ou optez pour le pack complet.",
  },
  {
    icon: CreditCard,
    title: "Ajoutez au panier et validez votre commande",
    description: "Paiement 100 % sécurisé par carte bancaire.",
  },
];

const LIBRARY_FEATURES: FeatureItem[] = [
  {
    icon: Music2,
    title: "Retrouvez toutes vos œuvres",
    description:
      "Vos achats sont disponibles dans votre bibliothèque personnelle, à tout moment.",
  },
  {
    icon: Download,
    title: "Téléchargez vos fichiers",
    description:
      "Accédez à tous les audios inclus dans votre offre et téléchargez-les autant de fois que vous voulez.",
  },
  {
    icon: Headphones,
    title: "Écoutez en ligne",
    description:
      "Utilisez notre lecteur intégré pour répéter où que vous soyez.",
  },
];

const PRACTICE_FEATURES: FeatureItem[] = [
  {
    icon: SlidersVertical,
    title: "Personnalisez votre écoute",
    description:
      "Réglez les volumes, isolez votre voix, ralentissez le tempo et bouclez les passages difficiles.",
  },
  {
    icon: AudioWaveform,
    title: "Travaillez efficacement",
    description:
      "Nos outils sont pensés pour vous aider à répéter plus sereinement et efficacement.",
  },
  {
    icon: BarChart3,
    title: "Progressez à votre rythme",
    description:
      "Des enregistrements de qualité professionnelle pour vous accompagner dans votre pratique.",
  },
  {
    icon: Heart,
    title: "Le plaisir de chanter",
    description:
      "Prenez du plaisir en chantant avec des enregistrements inspirants et immersifs.",
  },
];

const TRUST_ITEMS: FeatureItem[] = [
  {
    icon: Lock,
    title: "Accès sécurisé",
    description: "Vos données et vos achats sont protégés.",
  },
  {
    icon: InfinityIcon,
    title: "Téléchargements illimités",
    description: "Téléchargez vos fichiers autant de fois que vous voulez.",
  },
  {
    icon: RefreshCw,
    title: "Mises à jour incluses",
    description:
      "Les nouvelles versions des œuvres sont incluses gratuitement.",
  },
  {
    icon: Headset,
    title: "Besoin d'aide ?",
    description: "Notre équipe est là pour vous accompagner.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Comment ça marche — Butterfly Studio Choral",
    description:
      "Découvrez comment parcourir le catalogue, choisir votre offre et répéter avec les pistes audio par pupitre de Butterfly Studio Choral.",
    alternates: { canonical: "/comment-ca-marche" },
  };
}

// Trait décoratif fin — volontairement un simple div plutôt que le composant
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

function StepCircleItem({ icon: Icon, title, description }: FeatureItem) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="max-w-56 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ChooseWorkSection() {
  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-10 py-16 sm:py-20">
        <SectionHeading>1. Choisissez votre œuvre</SectionHeading>
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          {CHOOSE_WORK_STEPS.map((step, index) => (
            <Fragment key={step.title}>
              <StepCircleItem {...step} />
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

function LibraryFeatureRow({ icon: Icon, title, description }: FeatureItem) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LibrarySection() {
  return (
    <section className="bg-secondary/30">
      <Container className="py-16 sm:py-20">
        <SectionHeading>2. Accédez à votre bibliothèque</SectionHeading>
        <div className="mt-10 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div
            className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-background"
            role="img"
            aria-label="Aperçu de la bibliothèque personnelle"
          >
            {/* TODO : remplacer par une capture réelle de la bibliothèque */}
            <Music2
              className="size-12 text-muted-foreground/50"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col gap-8">
            {LIBRARY_FEATURES.map((feature) => (
              <LibraryFeatureRow key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function PracticeFeatureItem({ icon: Icon, title, description }: FeatureItem) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Icon className="size-6 text-primary" aria-hidden="true" />
      <h3 className="font-medium">{title}</h3>
      <p className="max-w-56 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PracticeSection() {
  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-10 py-16 sm:py-20">
        <SectionHeading>3. Répétez et progressez</SectionHeading>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {PRACTICE_FEATURES.map((feature) => (
            <PracticeFeatureItem key={feature.title} {...feature} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function TrustItem({ icon: Icon, title, description }: FeatureItem) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function TrustSection() {
  return (
    <section className="border border-border bg-secondary/30">
      <Container className="py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <TrustItem key={item.title} {...item} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function CtaSection() {
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
              Prêt à commencer ?
            </h2>
            <p className="text-muted-foreground">
              Explorez notre catalogue et trouvez l&apos;œuvre qui vous fera
              vibrer.
            </p>
          </div>
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ size: "lg" }),
              "shrink-0 gap-1.5 rounded-full px-6",
            )}
          >
            Découvrir le catalogue
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

export default function CommentCaMarchePage() {
  return (<>
      <section className="max-w-7xl mx-auto bg-background">
        <Container className="flex flex-col gap-8 pt-2 sm:pt-6">
          <nav
            aria-label="Fil d'Ariane"
            className="text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary">
              Accueil
            </Link>
            <span className="mx-2">-{'>'}</span>
            <span aria-current="page" className="text-foreground">
              Comment ça marche
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
            Comment ça marche
          </h1>
          <OrnamentalRule />
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            Accédez à vos œuvres, écoutez, répétez et progressez en toute
            simplicité.
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
