import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Playfair_Display } from "next/font/google";
import { Music2 } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { AccessSidebar } from "@/components/work/access-sidebar";
import { CollapsibleAccessPanel } from "@/components/work/collapsible-access-panel";
import { StudioPlaceholder } from "@/components/work/studio-placeholder";
import { DownloadFileGrid } from "@/components/work/download-file-grid";
import { MovementPanelSwitcher } from "@/components/work/movement-panel-switcher";
import { OfferSelector } from "@/components/work/offer-selector";
import { SyncDynamicRouteAlternates } from "@/components/layout/dynamic-route-alternates";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { resolveWorkTranslation } from "@/lib/works/resolve-translation";
import { isKnownWorkLanguageCode } from "@/lib/works/work-language";
import { isKnownVoiceCode } from "@/lib/works/voice-label";
import { buildWorkPageViewModel } from "@/lib/works/work-page-view-model";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserGrants } from "@/lib/catalog/access-grants";
import { buildWorkAccessInput } from "@/lib/catalog/work-access-input";
import { productToGrant } from "@/lib/catalog/product-grant";
import { absorbs } from "@/lib/access/grants";
import { resolveWorkAccess } from "@/lib/access/rules";
import { composeProductDisplayName } from "@/lib/products/product-display-name";
import type { Grant, WorkAccess } from "@/types/domain";

// Page centrale du produit : son contenu dépend de l'utilisateur courant
// (droits résolus à chaque requête). Jamais de rendu statique ni d'ISR ici.
export const dynamic = "force-dynamic";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Résout un slug d'URL vers une œuvre publiée.
 *
 * @remarks
 * Cherche d'abord une traduction pour la locale courante, puis retombe sur le
 * slug de référence. La clé de stockage des fichiers audio n'est jamais
 * sélectionnée, elle ne peut donc pas fuiter plus loin.
 *
 * L'appel est mémoïsé pour la durée de la requête, les métadonnées et la page
 * partageant ainsi un seul aller retour vers la base.
 *
 * @param slug - Slug demandé dans l'URL.
 * @param locale - Locale d'interface active.
 * @returns L'œuvre et ses relations, ou null si elle est introuvable ou non publiée.
 */
const findPublishedWorkBySlug = cache(
  async (slug: string, locale: AppLocale) => {
    const translation = await prisma.workTranslation.findFirst({
      where: { locale, slug },
      select: { workId: true },
    });

    const work = await prisma.work.findUnique({
      where: translation ? { id: translation.workId } : { slug },
      include: {
        movements: {
          orderBy: { position: "asc" },
          include: {
            audioFiles: {
              select: {
                type: true,
                voiceId: true,
                durationSeconds: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
        products: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            movement: { select: { id: true, title: true } },
            voice: { select: { code: true, label: true } },
          },
        },
        translations: true,
      },
    });

    if (!work || !work.isPublished) return null;
    return work;
  },
);

type WorkWithDetail = NonNullable<
  Awaited<ReturnType<typeof findPublishedWorkBySlug>>
>;

// generateMetadata (canonical + hreflang) est inchangée par cette passe de mise en page.
/**
 * Construit les métadonnées de la page œuvre.
 *
 * @remarks
 * Les liens alternatifs utilisent le slug traduit de chaque locale. La
 * description reprend le résumé de l'œuvre, ou un texte de repli composé à
 * partir du titre et du compositeur.
 *
 * @param props - Paramètres de route, dont le slug demandé.
 * @returns Les métadonnées, ou un objet vide si l'œuvre est introuvable.
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/works/[slug]">,
): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const { slug } = await props.params;

  const work = await findPublishedWorkBySlug(slug, locale);
  if (!work) return {};

  const resolved = resolveWorkTranslation(
    {
      slug: work.slug,
      title: work.title,
      shortDescription: work.shortDescription,
      description: work.description,
      translations: work.translations
        .filter((translation) => translation.locale === locale)
        .map((translation) => ({
          slug: translation.slug,
          title: translation.title,
          shortDescription: translation.shortDescription,
          description: translation.description,
        })),
    },
    locale,
  );

  const t = await getTranslations("work.workPage");

  const languages = Object.fromEntries(
    routing.locales.map((targetLocale) => {
      const localizedSlug =
        targetLocale === routing.defaultLocale
          ? work.slug
          : (work.translations.find((tr) => tr.locale === targetLocale)?.slug ??
            work.slug);
      return [
        targetLocale,
        getPathname({
          href: { pathname: "/works/[slug]", params: { slug: localizedSlug } },
          locale: targetLocale,
        }),
      ];
    }),
  );

  return {
    title: t("metaTitleTemplate", { title: resolved.title }),
    description:
      resolved.shortDescription ??
      t("metaDescriptionFallback", {
        title: resolved.title,
        composer: work.composer,
      }),
    alternates: {
      canonical: languages[locale],
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

/**
 * Page d'une œuvre.
 *
 * @remarks
 * Résout l'œuvre depuis son slug, charge l'utilisateur courant et ses droits,
 * puis construit le view model qui alimente l'en tête, le panneau d'accès, les
 * téléchargements et les offres. Bascule en 404 si l'œuvre est introuvable ou
 * non publiée.
 *
 * @param props - Paramètres de route, dont le slug demandé.
 * @returns La page rendue.
 */
export default async function WorkPage(
  props: PageProps<"/[locale]/works/[slug]">,
) {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const { slug } = await props.params;

  const work: WorkWithDetail | null = await findPublishedWorkBySlug(
    slug,
    locale,
  );
  if (!work) {
    notFound();
  }

  const dynamicRouteAlternates = {
    fr: work.slug,
    en:
      work.translations.find((translation) => translation.locale === "en")
        ?.slug ?? work.slug,
  };

  // User actuel + voices (pour traduire voiceId → voiceCode, puis voiceCode → label traduit)
  const [currentUser, voices] = await Promise.all([
    getCurrentUser(),
    prisma.voice.findMany({ orderBy: { position: "asc" } }),
  ]);
  // Droits du user
  const grants: Grant[] = currentUser
    ? await getUserGrants(currentUser.id)
    : [];

  const t = await getTranslations("work");
  const tWorkPage = await getTranslations("work.workPage");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("navigation");
  const format = await getFormatter();

  // Construit WorkAccessInput du domaine (src/types/domain.ts) à partir de la Work
  const workAccessInput = buildWorkAccessInput(
    work.id,
    work.movements,
    new Map(voices.map((voice) => [voice.id, voice.code])),
  );

  // Résout les droits de l'utilisateur sur l'œuvre entière, par mouvement et par pupitre
  const access: WorkAccess = resolveWorkAccess(workAccessInput, grants);

  const resolved = resolveWorkTranslation(
    {
      slug: work.slug,
      title: work.title,
      shortDescription: work.shortDescription,
      description: work.description,
      translations: work.translations
        .filter((translation) => translation.locale === locale)
        .map((translation) => ({
          slug: translation.slug,
          title: translation.title,
          shortDescription: translation.shortDescription,
          description: translation.description,
        })),
    },
    locale,
  );

  function translateWorkLanguage(code: string): string {
    return isKnownWorkLanguageCode(code) ? t(`language.${code}`) : code;
  }

  // Libellé traduit d'un pupitre (repli sur le code brut si non connu) -
  // callback injecté dans le view-model, pas d'import direct de next-intl là-bas.
  function getVoiceLabel(code: string): string {
    return isKnownVoiceCode(code) ? t(`voice.${code}`) : code;
  }

  // Capturé dans une constante parce que TypeScript n'affine pas work en non
  // nul à l'intérieur d'une déclaration de fonction hoistée.
  const workId = work.id;

  // Savoir si  l'utilisateur possède déjà le produit (pupitre ou œuvre complète) : si un Grant existant absorbe le produit.
  function isAbsorbed(product: WorkWithDetail["products"][number]): boolean {
    const candidate = productToGrant(workId, product);
    if (grants.some((grant) => absorbs(grant, candidate))) {
      return true;
    }

    if (candidate.coverage !== "ALL_VOICES") {
      return false;
    }
    return candidate.scope === "WORK"
      ? access.ownsFullWork
      : (access.movements[candidate.movementId ?? ""]?.allVoicesOwned ?? false);
  }

  // Construit le libellé de prix d'un produit (pupitre ou œuvre complète) pour l'affichage dans les cartes de pack.
  function priceLabelFor(priceCents: number, currency: string): string {
    return format.number(priceCents / 100, {
      style: "currency",
      currency,
    });
  }

  // Compose le nom affiché d'un produit (pupitre ou oeuvre complète) pour l'affichage dans les cartes de pack.
  function composeProductName(
    voiceLabel: string | null,
    targetTitle: string,
  ): string {
    return composeProductDisplayName({
      voiceLabel,
      targetTitle,
      t: (key, values) => t(`product.${key}`, values),
    });
  }

  const {
    downloadGroups,
    hasTuttiDownload,
    hasAccompanimentDownload,
    defaultDownloadMovementId,
    movementOfferGroups,
    defaultOfferMovementId,
    workSingleVoiceCards,
    workAllVoicesCard,
    hasSingleMovement,
  } = buildWorkPageViewModel({
    access,
    layout: workAccessInput,
    workId,
    voices,
    movements: work.movements,
    products: work.products,
    workTitle: resolved.title,
    getVoiceLabel,
    getPriceLabel: priceLabelFor,
    composeProductName,
    isAlreadyOwned: isAbsorbed,
  });

  // Pupitres débloqués/verrouillés par mouvement, pour l'affichage dans
  // « Votre accès » (AccessSidebar) : un mouvement -> ses pupitres, chacun
  // marqué possédé ou non.
  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));
  const movementVoiceAccess = work.movements.map((movement) => {
    const movementVoiceCodes = new Set<string>();
    for (const track of movement.audioFiles) {
      if (track.voiceId) {
        const code = voiceCodeById.get(track.voiceId);
        if (code) movementVoiceCodes.add(code);
      }
    }
    const ownedCodes = access.movements[movement.id]?.ownedVoiceCodes ?? [];
    return {
      movementId: movement.id,
      movementTitle: movement.title,
      voices: voices
        .filter((voice) => movementVoiceCodes.has(voice.code))
        .map((voice) => ({
          code: voice.code,
          label: getVoiceLabel(voice.code),
          owned: ownedCodes.includes(voice.code),
        })),
    };
  });

  const sidebar = (
    <AccessSidebar
      movements={movementVoiceAccess}
      hasTuttiDownload={hasTuttiDownload}
      hasAccompanimentDownload={hasAccompanimentDownload}
    />
  );

  return (
    <>
      <SyncDynamicRouteAlternates alternates={dynamicRouteAlternates} />
      <section className="max-w-7xl mx-auto bg-background">
        <Container className="flex flex-col gap-10 pt-2 pb-14 sm:pt-6">
          <nav
            aria-label={tCommon("breadcrumbAriaLabel")}
            className="text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary !underline">
              {tCommon("breadcrumbHome")}
            </Link>
            <span className="mx-2">-{">"}</span>
            <Link href="/catalogue" className="hover:text-primary !underline">
              {tNav("links.catalogue")}
            </Link>
            <span className="mx-2">-{">"}</span>
            <span aria-current="page" className="text-foreground">
              {resolved.title}
            </span>
          </nav>

          {/* En-tête : visuel + informations */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:items-start">
            <div
              aria-hidden="true"
              className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-secondary text-primary"
            >
              {/* coverImageKey est vide pour l'instant : emplacement réservé,
                  jamais une image inexistante. */}
              <Music2 className="size-12" />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end text-end gap-2 items-baseline">
                <h1
                  className={cn(
                    "text-3xl tracking-tight sm:text-4xl",
                    playfairDisplay.className,
                  )}
                >
                  {resolved.title}
                </h1>
                {work.catalogueRef ? (
                  <Badge className="text-xl p-3" variant="outline">
                    {work.catalogueRef}
                  </Badge>
                ) : null}
              </div>
              <p className="text-lg text-muted-foreground">{work.composer}</p>

              <div className="flex flex-wrap items-center gap-1.5">
                {work.period ? (
                  <Badge variant="secondary">
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

              {resolved.description ? (
                <p className="max-w-3xl text-muted-foreground">
                  {resolved.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* « Votre accès » - masquée en dessous de lg (pas assez de place
              pour la déporter hors du flux sans empiéter sur le contenu) ;
              à partir de lg, déportée hors du Container et collée au bord
              droit de la fenêtre (fixed), rétractable pour dégager la vue. */}
          <CollapsibleAccessPanel
            expandLabel={tWorkPage("sidebarExpand")}
            collapseLabel={tWorkPage("sidebarCollapse")}
            movements={movementVoiceAccess}
          >
            {sidebar}
          </CollapsibleAccessPanel>
          <StudioPlaceholder unlocked={access.unlockedMovementCount > 0} />

          {/* Téléchargements */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">
              {tWorkPage("downloadsHeading")}
            </h2>
            {hasSingleMovement ? (
              <DownloadFileGrid entries={downloadGroups[0]?.entries ?? []} />
            ) : (
              <MovementPanelSwitcher
                selectorLabel={tWorkPage("movementSelectorLabel")}
                defaultMovementId={defaultDownloadMovementId}
                movements={downloadGroups.map((group) => ({
                  id: group.movementId,
                  label: group.movementTitle,
                  panel: <DownloadFileGrid entries={group.entries} />,
                }))}
              />
            )}
          </div>

          {/* Étendre votre accès : onglets par mouvement et par oeuvre,
              absents si l'oeuvre est déjà possédée en intégralité. */}
          {!access.ownsFullWork ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">
                  {tWorkPage("extendAccessHeading")}
                </h2>
                {work.movements.length > 1 ? (
                  <p className="text-sm text-muted-foreground">
                    {tWorkPage("extendAccessHeadingLead")}
                  </p>
                ) :null}
              </div>
              <OfferSelector
                movementGroups={hasSingleMovement ? [] : movementOfferGroups}
                workOffers={[
                  ...workSingleVoiceCards,
                  ...(workAllVoicesCard ? [workAllVoicesCard] : []),
                ]}
                defaultMovementId={defaultOfferMovementId}
              />
            </div>
          ) : null}
        </Container>
      </section>
    </>
  );
}
