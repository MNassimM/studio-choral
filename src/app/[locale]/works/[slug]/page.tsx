import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { Playfair_Display } from "next/font/google";
import {
  CheckCircle2,
  LockKeyhole,
  Download,
  Lock,
  Music2,
  SlidersVertical,
} from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MovementPanelSwitcher } from "@/components/work/movement-panel-switcher";
import { SyncDynamicRouteAlternates } from "@/components/layout/dynamic-route-alternates";
import { Link, getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { resolveWorkTranslation } from "@/lib/works/resolve-translation";
import { isKnownWorkLanguageCode } from "@/lib/works/work-language";
import { isKnownVoiceCode } from "@/lib/works/voice-label";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserGrants } from "@/lib/catalog/access-grants";
import { buildWorkAccessInput } from "@/lib/catalog/work-access-input";
import { absorbs } from "@/lib/access/grants";
import {
  canDownload,
  PREVIEW_DURATION_SECONDS,
  resolveWorkAccess,
} from "@/lib/access/rules";
import { composeProductDisplayName } from "@/lib/products/product-display-name";
import type { AudioType, Grant, WorkAccess } from "@/types/domain";

// Page centrale du produit : son contenu dépend de l'utilisateur courant
// (droits résolus à chaque requête). Jamais de rendu statique ni d'ISR ici.
export const dynamic = "force-dynamic";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Résout le slug d'URL vers une Work : cherche d'abord une WorkTranslation
 * pour la locale courante (le cas normal en anglais, et le cas des incipits
 * qui déclarent une traduction avec le même slug), retombe sur Work.slug
 * sinon (le cas normal en français, langue de référence sans ligne
 * WorkTranslation). N'inclut JAMAIS storageKey : ce champ n'est même pas
 * sélectionné, impossible de le laisser fuiter par erreur plus loin.
 *
 * Enveloppée dans React `cache()` : generateMetadata() et la page elle-même
 * appellent cette fonction avec les mêmes arguments dans la même requête -
 * sans ce cache, ce serait deux allers-retours base de données identiques.
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

// ─── Types de vue ──────────────────────────────────────────────────────────

type SidebarVoiceView = { code: string; label: string };

// PREVIEW n'est jamais téléchargeable (voir la boucle qui construit
// downloadGroups : les pistes PREVIEW sont exclues avant insertion) - type
// resserré pour que ce soit vérifié statiquement, pas seulement en commentaire.
type DownloadableAudioType = Exclude<AudioType, "PREVIEW">;

type DownloadFileEntry = {
  audioType: DownloadableAudioType;
  voiceLabel: string | null;
  mimeType: string;
  sizeBytes: number | null;
  owned: boolean;
};

type MovementDownloadGroup = {
  movementId: string;
  movementTitle: string;
  unlocked: boolean;
  entries: DownloadFileEntry[];
};

type SimpleOfferView = { sku: string; name: string; priceLabel: string };

type OwnedOfferView = SimpleOfferView & { alreadyOwned: boolean };

type MovementOfferGroup = {
  movementId: string;
  movementTitle: string;
  fullyOwned: boolean;
  offers: OwnedOfferView[];
};

// ─── Petits composants de présentation ─────────────────────────────────────

function VoicePill({
  label,
  owned,
  t,
}: {
  label: string;
  owned: boolean;
  t: Awaited<ReturnType<typeof getTranslations<"work.workPage">>>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        owned
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border text-muted-foreground",
      )}
    >
      {owned ? (
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
      ) : (
        <Lock className="size-3.5" aria-hidden="true" />
      )}
      {label}
      <span className="sr-only">
        {" "}
        - {owned ? t("voiceOwned") : t("voiceLocked")}
      </span>
    </span>
  );
}

async function AccessSidebar({
  access,
  ownedVoices,
  lockedVoices,
  hasTuttiDownload,
  hasAccompanimentDownload,
}: {
  access: WorkAccess;
  ownedVoices: SidebarVoiceView[];
  lockedVoices: SidebarVoiceView[];
  hasTuttiDownload: boolean;
  hasAccompanimentDownload: boolean;
}) {
  const t = await getTranslations("work.workPage");

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-border bg-card/95 p-5 shadow-sm backdrop-blur-sm">
      <h2 className="text-lg font-semibold">{t("sidebarHeading")}</h2>

      <p className="text-sm font-medium">
        {access.ownsFullWork
          ? t("fullWorkOwned")
          : access.ownsAnything
            ? t("sidebarProgressByVoice", {
                voices: ownedVoices.map((voice) => voice.label).join(", "),
                unlocked: access.unlockedMovementCount,
                total: access.totalMovementCount,
              })
            : t("sidebarNoAccess")}
      </p>

      {access.ownsAnything ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("sidebarIncludesHeading")}
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t("sidebarBulletListening")}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              {t("sidebarBulletDownloadVoice")}
            </li>
            {hasTuttiDownload ? (
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {t("sidebarBulletDownloadTutti")}
              </li>
            ) : null}
            {hasAccompanimentDownload ? (
              <li className="flex items-center gap-2">
                <CheckCircle2
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {t("sidebarBulletAccompaniment")}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {lockedVoices.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("sidebarLockedHeading")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {lockedVoices.map((voice) => (
              <VoicePill
                key={voice.code}
                label={voice.label}
                owned={false}
                t={t}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

async function StudioPlaceholder({ unlocked }: { unlocked: boolean }) {
  const t = await getTranslations("work.workPage");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-6",
        unlocked
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-secondary/20",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            unlocked
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {unlocked ? (
            <SlidersVertical className="size-5" />
          ) : (
            <Lock className="size-5" />
          )}
        </div>
        <h2 className="text-lg font-semibold">{t("studioHeading")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("studioDescription")}</p>
      {!unlocked ? (
        <p className="text-sm font-medium text-muted-foreground">
          {t("studioLockedNotice")}
        </p>
      ) : null}
      {/* TODO : Studio audio - étape suivante */}
    </div>
  );
}

function formatFileSize(
  bytes: number,
  t: Awaited<ReturnType<typeof getTranslations<"work.workPage">>>,
): string {
  const kb = bytes / 1024;
  if (kb < 1024) return t("fileSizeKB", { size: Math.round(kb) });
  return t("fileSizeMB", { size: Math.round((kb / 1024) * 10) / 10 });
}

function formatAudioFormatLabel(mimeType: string): string {
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.toUpperCase() : mimeType;
}

async function DownloadFileGrid({ entries }: { entries: DownloadFileEntry[] }) {
  const t = await getTranslations("work.workPage");

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("downloadsEmpty")}</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {entries.map((entry, index) => (
        <div
          key={`${entry.audioType}-${entry.voiceLabel ?? "all"}-${index}`}
          className={cn(
            "flex flex-col items-center justify-between rounded-xl border px-3 py-4 text-center transition-colors",
            entry.owned
              ? "border-border"
              : "border-border/60 bg-muted/30 opacity-70",
          )}
        >
          {/* Icône en haut */}
          <div className="flex flex-1 items-center justify-center">
            {entry.owned ? (
              <Download
                className="size-6 text-primary"
                aria-hidden="true"
              />
            ) : (
              <LockKeyhole
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Texte principal */}
          <div className="mt-2 w-full min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium leading-tight">
              {entry.voiceLabel ? `${entry.voiceLabel} - ` : ""}
              {t(`audioType.${entry.audioType}`)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatAudioFormatLabel(entry.mimeType)}
              {entry.sizeBytes !== null && (
                <> · {formatFileSize(entry.sizeBytes, t)}</>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PackCard({
  offer,
  bullets,
  addToCartLabel,
  featured = false,
  featuredBadge,
  alreadyOwned = false,
  alreadyOwnedBadge,
  unlocksLabel,
  unlocksVoices,
  size = "default",
}: {
  offer: SimpleOfferView;
  bullets: string[];
  addToCartLabel: string;
  featured?: boolean;
  featuredBadge?: string;
  alreadyOwned?: boolean;
  alreadyOwnedBadge?: string;
  unlocksLabel?: string;
  unlocksVoices?: string[];
  /** "sm" pour les cartes par mouvement — visuellement plus petites que
   * celles de l'œuvre complète, l'offre principale. */
  size?: "default" | "sm";
}) {
  const isSmall = size === "sm";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-2xl border text-center",
        isSmall ? "p-4" : "p-6",
        alreadyOwned
          ? "border-border bg-muted/30 opacity-60"
          : featured
            ? "border-primary bg-card shadow-md ring-1 ring-primary/30"
            : "border-border bg-card shadow-sm",
      )}
    >
      {alreadyOwned && alreadyOwnedBadge ? (
        <Badge
          variant="outline"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-background"
        >
          {alreadyOwnedBadge}
        </Badge>
      ) : featured && featuredBadge ? (
        <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          {featuredBadge}
        </Badge>
      ) : null}

      <div
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          isSmall ? "size-9" : "size-14",
          alreadyOwned
            ? "bg-muted text-muted-foreground"
            : "bg-secondary text-primary",
        )}
      >
        <Music2 className={isSmall ? "size-4" : "size-6"} />
      </div>

      <span className={cn("font-medium", isSmall ? "text-xs" : "text-sm")}>
        {offer.name}
      </span>
      <span
        className={cn(
          "font-semibold",
          alreadyOwned ? "text-muted-foreground" : "text-primary",
          isSmall ? "text-lg" : "text-3xl",
        )}
      >
        {offer.priceLabel}
      </span>

      {!alreadyOwned &&
      unlocksLabel &&
      unlocksVoices &&
      unlocksVoices.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {unlocksLabel} {unlocksVoices.join(", ")}
        </p>
      ) : null}

      <ul
        className={cn(
          "flex flex-col gap-1 text-muted-foreground",
          isSmall ? "text-xs" : "text-sm",
        )}
      >
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-1.5 text-start">
            <CheckCircle2
              className={cn(
                "shrink-0 text-primary",
                isSmall ? "size-3" : "size-3.5",
              )}
              aria-hidden="true"
            />
            {bullet}
          </li>
        ))}
      </ul>

      {alreadyOwned ? null : (
        // TODO : panier non implémenté
        <Button
          disabled
          size={isSmall ? "sm" : "default"}
          className="mt-2 w-full rounded-full"
        >
          {addToCartLabel}
        </Button>
      )}
    </div>
  );
}

async function MovementOfferPanel({ offers }: { offers: OwnedOfferView[] }) {
  const t = await getTranslations("work.workPage");
  const tCard = await getTranslations("work.card");

  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("extendAccessMovementFullyOwnedNotice")}
      </p>
    );
  }

  const bullets = [
    t("extendAccessBulletPredominant"),
    t("extendAccessBulletMix"),
    t("extendAccessBulletTempo"),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {offers.map((offer) => (
        <PackCard
          key={offer.sku}
          offer={offer}
          bullets={bullets}
          addToCartLabel={tCard("addToCart")}
          alreadyOwned={offer.alreadyOwned}
          alreadyOwnedBadge={t("extendAccessAlreadyOwnedBadge")}
          size="sm"
        />
      ))}
    </div>
  );
}

async function WholeWorkOffers({
  singleVoiceCards,
  allVoicesCard,
  ownsAnything,
  unlocksVoices,
}: {
  singleVoiceCards: OwnedOfferView[];
  allVoicesCard: SimpleOfferView | null;
  ownsAnything: boolean;
  unlocksVoices: string[];
}) {
  const t = await getTranslations("work.workPage");
  const tCard = await getTranslations("work.card");

  const singleVoiceBullets = [
    t("extendAccessBulletPredominant"),
    t("extendAccessBulletMix"),
    t("extendAccessBulletTempo"),
  ];
  const allVoicesBullets = [
    t("extendAccessBulletPredominant"),
    t("extendAccessBulletTuttiDownload"),
    t("extendAccessBulletMix"),
    t("extendAccessBulletTempo"),
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {singleVoiceCards.map((offer) => (
        <PackCard
          key={offer.sku}
          offer={offer}
          bullets={singleVoiceBullets}
          addToCartLabel={tCard("addToCart")}
          alreadyOwned={offer.alreadyOwned}
          alreadyOwnedBadge={t("extendAccessAlreadyOwnedBadge")}
        />
      ))}
      {allVoicesCard ? (
        <PackCard
          offer={allVoicesCard}
          bullets={allVoicesBullets}
          addToCartLabel={tCard("addToCart")}
          featured
          featuredBadge={t("extendAccessFeaturedBadge")}
          unlocksLabel={
            ownsAnything ? t("extendAccessUnlocksLabel") : undefined
          }
          unlocksVoices={ownsAnything ? unlocksVoices : undefined}
        />
      ) : null}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

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

  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));
  // Voice.label (base) est en français, saisi pour l'admin - jamais affiché
  // tel quel : on préfère la traduction work.voice.* quand le code SATB est
  // connu, repli sur le libellé brut pour un pupitre divisé pas encore
  // documenté (SOPRANO_1...).
  const voiceLabelByCode = new Map(
    voices.map((voice) => [
      voice.code,
      isKnownVoiceCode(voice.code) ? t(`voice.${voice.code}`) : voice.label,
    ]),
  );
  const voiceOrderByCode = new Map(
    voices.map((voice, index) => [voice.code, index]),
  );

  // Construit WorkAccessInput du domaine (src/types/domain.ts) à partir de la Work
  const workAccessInput = buildWorkAccessInput(
    work.id,
    work.movements,
    voiceCodeById,
  );

  // Résout les droits de l'utilisateur sur l'œuvre entière, par mouvement et par pupitre
  const access: WorkAccess = resolveWorkAccess(workAccessInput, grants);
  const voiceCodesByMovementId = new Map(
    workAccessInput.movements.map((movement) => [
      movement.id,
      movement.voiceCodes,
    ]),
  );

  // Détermine si l'utilisateur possède tous les pupitres d'un mouvement donné
  function isMovementFullyOwned(movementId: string): boolean {
    const voiceCodes = voiceCodesByMovementId.get(movementId) ?? []; // tous les pupitres du mouvement
    const owned = access.movements[movementId]?.ownedVoiceCodes ?? []; // pupitres possédés par l'utilisateur sur ce mouvement
    return (
      voiceCodes.length > 0 && voiceCodes.every((code) => owned.includes(code)) // vrai si pupitres possédés = pupitres du mouvement
    );
  }

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

  // --- Pupitres de l'œuvre entière (pour la sidebar « Votre accès ») ---
  const allWorkVoiceCodesSet = new Set<string>();
  for (const codes of voiceCodesByMovementId.values()) {
    for (const code of codes) allWorkVoiceCodesSet.add(code);
  }
  const allWorkVoiceCodes = Array.from(allWorkVoiceCodesSet).sort(
    (a, b) => (voiceOrderByCode.get(a) ?? 0) - (voiceOrderByCode.get(b) ?? 0),
  );
  const ownedVoiceViews: SidebarVoiceView[] = allWorkVoiceCodes
    .filter((code) => access.ownedVoiceCodes.includes(code))
    .map((code) => ({ code, label: voiceLabelByCode.get(code) ?? code }));
  const lockedVoiceViews: SidebarVoiceView[] = allWorkVoiceCodes
    .filter((code) => !access.ownedVoiceCodes.includes(code))
    .map((code) => ({ code, label: voiceLabelByCode.get(code) ?? code }));

  // --- Téléchargements - dérivés exclusivement de canDownload(), fichiers
  // verrouillés inclus (grisés, sans URL) ---
  const downloadGroups: MovementDownloadGroup[] = work.movements.map(
    (movement) => {
      const entries: DownloadFileEntry[] = [];
      for (const track of movement.audioFiles) {
        if (track.type === "PREVIEW") continue;
        const voiceCode = track.voiceId
          ? (voiceCodeById.get(track.voiceId) ?? null)
          : null;
        const owned = canDownload(access, {
          movementId: movement.id,
          type: track.type,
          voiceCode,
        });
        entries.push({
          audioType: track.type,
          voiceLabel: voiceCode
            ? (voiceLabelByCode.get(voiceCode) ?? voiceCode)
            : null,
          mimeType: track.mimeType,
          sizeBytes: track.sizeBytes,
          owned,
        });
      }
      return {
        movementId: movement.id,
        movementTitle: movement.title,
        unlocked: access.movements[movement.id].unlocked,
        entries,
      };
    },
  );

  const hasTuttiDownload = downloadGroups.some((group) =>
    group.entries.some((entry) => entry.audioType === "TUTTI" && entry.owned),
  );
  const hasAccompanimentDownload = downloadGroups.some((group) =>
    group.entries.some(
      (entry) => entry.audioType === "ACCOMPANIMENT" && entry.owned,
    ),
  );

  const defaultDownloadMovementId =
    downloadGroups.find((group) => group.unlocked)?.movementId ??
    downloadGroups[0]?.movementId ??
    "";

  // Construire le nom affiché d'un produit (pupitre ou œuvre complète) pour l'affichage dans les cartes de pack.
  function composeName(product: WorkWithDetail["products"][number]): string {
    const voiceLabel = product.voice
      ? (voiceLabelByCode.get(product.voice.code) ?? product.voice.label)
      : null;
    const targetTitle =
      product.scope === "WORK"
        ? resolved.title
        : (product.movement?.title ?? resolved.title);
    return composeProductDisplayName({
      voiceLabel,
      targetTitle,
      t: (key, values) => t(`product.${key}`, values),
    });
  }

  // Fonction fléchée (pas `function` hoisté) : TypeScript ne peut affiner
  // `work` en non-null à travers une déclaration hoistée, seulement à travers
  // une expression définie après le contrôle `if (!work) notFound()`.
  const buildCandidate = (
    product: WorkWithDetail["products"][number],
  ): Grant => ({
    workId: work.id,
    movementId: product.movementId,
    voiceCode: product.voice?.code ?? null,
    scope: product.scope,
    coverage: product.coverage,
  });

  // Savoir si  l'utilisateur possède déjà le produit (pupitre ou œuvre complète) : si un Grant existant absorbe le produit.
  function isAbsorbed(product: WorkWithDetail["products"][number]): boolean {
    const candidate = buildCandidate(product);
    return grants.some((grant) => absorbs(grant, candidate));
  }

  // Construit le libellé de prix d'un produit (pupitre ou œuvre complète) pour l'affichage dans les cartes de pack.
  function priceLabelFor(product: WorkWithDetail["products"][number]): string {
    return format.number(product.priceCents / 100, {
      style: "currency",
      currency: product.currency,
    });
  }

  // Toutes les offres du mouvement (déjà possédées comprises, grisées avec un bandeau)
  const movementOfferGroups: MovementOfferGroup[] = work.movements.map(
    (movement) => ({
      movementId: movement.id,
      movementTitle: movement.title,
      fullyOwned: isMovementFullyOwned(movement.id),
      offers: work.products
        .filter(
          (product) =>
            product.scope === "MOVEMENT" && product.movementId === movement.id,
        )
        .map((product) => ({
          sku: product.sku,
          name: composeName(product),
          priceLabel: priceLabelFor(product),
          alreadyOwned: isAbsorbed(product),
        })),
    }),
  );
  const defaultOfferMovementId =
    movementOfferGroups.find((group) => !group.fullyOwned)?.movementId ??
    movementOfferGroups[0]?.movementId ??
    "";

  // Œuvre complète - toujours les 4 pupitres (déjà possédés compris,affichés grisés avec un bandeau)
  const workScopeProducts = work.products.filter(
    (product) => product.scope === "WORK",
  );
  const workSingleVoiceCards: OwnedOfferView[] = workScopeProducts
    .filter((product) => product.coverage === "SINGLE_VOICE")
    .map((product) => ({
      sku: product.sku,
      name: composeName(product),
      priceLabel: priceLabelFor(product),
      alreadyOwned: isAbsorbed(product),
    }));
  const workAllVoicesProduct = workScopeProducts.find(
    (product) => product.coverage === "ALL_VOICES",
  );
  const workAllVoicesCard: SimpleOfferView | null = workAllVoicesProduct
    ? {
        sku: workAllVoicesProduct.sku,
        name: composeName(workAllVoicesProduct),
        priceLabel: priceLabelFor(workAllVoicesProduct),
      }
    : null;

  const hasSingleMovement = work.movements.length === 1;

  const sidebar = (
    <AccessSidebar
      access={access}
      ownedVoices={ownedVoiceViews}
      lockedVoices={lockedVoiceViews}
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
            <Link href="/" className="hover:text-primary">
              {tCommon("breadcrumbHome")}
            </Link>
            <span className="mx-2">-{">"}</span>
            <Link href="/catalogue" className="hover:text-primary">
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
              <div className="flex flex-wrap items-center gap-2 items-baseline">
                <h1
                  className={cn(
                    "text-3xl tracking-tight sm:text-4xl",
                    playfairDisplay.className,
                  )}
                >
                  {resolved.title}
                </h1>
                {work.catalogueRef ? (
                  <Badge variant="outline">{work.catalogueRef}</Badge>
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

          {/* « Votre accès » - dans le flux (pleine largeur, en tête) jusqu'à
              1920px ; au-delà, déportée hors du Container et collée au bord
              droit de la fenêtre (fixed), sans déplacer le centrage du
              Container lui-même puisqu'un élément fixed est retiré du flux. */}
          <div className="w-full min-[1920px]:fixed min-[1920px]:top-20 min-[1920px]:right-4 min-[1920px]:z-30 min-[1920px]:w-60 min-[1920px]:max-h-[calc(100vh-6rem)] min-[1920px]:overflow-y-auto">
            {sidebar}
          </div>
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

          {/* Étendre votre accès - absente si l'œuvre est déjà possédée en
              intégralité ; sinon toujours au moins la carte « toutes les
              voix », le mouvement d'abord (engagement faible), l'œuvre
              complète ensuite (offre principale, en conclusion). */}
          {!access.ownsFullWork ? (
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-semibold">
                {tWorkPage("extendAccessHeading")}
              </h2>

              {!hasSingleMovement ? (
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {tWorkPage("offersScopeMovement")}
                  </h3>
                  <MovementPanelSwitcher
                    selectorLabel={tWorkPage("movementSelectorLabel")}
                    defaultMovementId={defaultOfferMovementId}
                    movements={movementOfferGroups.map((group) => ({
                      id: group.movementId,
                      label: group.movementTitle,
                      statusLabel: group.fullyOwned
                        ? tWorkPage("extendAccessAlreadyOwnedBadge")
                        : "",
                      panel: <MovementOfferPanel offers={group.offers} />,
                    }))}
                  />
                </div>
              ) : null}

              <WholeWorkOffers
                singleVoiceCards={workSingleVoiceCards}
                allVoicesCard={workAllVoicesCard}
                ownsAnything={access.ownsAnything}
                unlocksVoices={lockedVoiceViews.map((voice) => voice.label)}
              />
            </div>
          ) : null}
        </Container>
      </section>
    </>
  );
}
