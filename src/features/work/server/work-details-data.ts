import "server-only";

import { getFormatter, getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/features/auth/server/current-user";
import { getUserGrants } from "@/features/catalog/server/access-grants";
import { productToGrant } from "@/features/catalog/server/product-grant";
import { buildWorkAccessInput } from "@/features/catalog/server/work-access-input";
import type { AccessSidebar } from "@/features/work/components/access-sidebar";
import { isKnownVoiceCode } from "@/features/work/domain/voice-label";
import {
  resolvePublishedWorkTranslation,
  type WorkWithDetail,
} from "@/features/work/server/published-work";
import {
  buildWorkPageViewModel,
  type WorkPageViewModel,
} from "@/features/work/server/work-details-view-model";
import { absorbs } from "@/domain/access/grant-dedupe";
import { resolveWorkAccess } from "@/domain/access/work-access";
import { composeProductDisplayName } from "@/domain/product/product-display-name";
import type { Grant, WorkAccess } from "@/domain/types";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/server/db/prisma";

/**
 * Le visiteur de la page œuvre : son compte, ses droits, et les pupitres.
 */
async function loadWorkViewer() {
  // User actuel + voices (pour traduire voiceId → voiceCode, puis voiceCode → label traduit)
  const [currentUser, voices] = await Promise.all([
    getCurrentUser(),
    prisma.voice.findMany({ orderBy: { position: "asc" } }),
  ]);
  // Droits du user
  const grants: Grant[] = currentUser
    ? await getUserGrants(currentUser.id)
    : [];

  return { currentUser, voices, grants };
}

type WorkViewer = Awaited<ReturnType<typeof loadWorkViewer>>;

/** Pupitres débloqués ou verrouillés, par mouvement. */
type MovementVoiceAccess = Parameters<
  typeof AccessSidebar
>[0]["movements"][number];

/**
 * Tout ce que la page œuvre affiche, droits résolus et textes traduits.
 */
type WorkDetailsData = {
  title: string;
  description: string | null;
  access: WorkAccess;
  viewModel: WorkPageViewModel;
  movementVoiceAccess: MovementVoiceAccess[];
  /** Où revenir si la session a expiré avant un téléchargement. */
  downloadReturnTo: string;
};

/**
 * Prépare les données de la page œuvre.
 *
 * @remarks
 * Résout les droits du visiteur, puis construit le view model qui alimente
 * le panneau d'accès, les téléchargements et les offres.
 *
 * @param work - Œuvre publiée, déjà résolue depuis le slug.
 * @param viewer - Visiteur chargé par loadWorkViewer.
 * @param locale - Locale d'interface active.
 * @param slug - Slug demandé dans l'URL.
 * @returns Les données prêtes à être rendues.
 */
async function buildWorkDetailsData({
  work,
  viewer,
  locale,
  slug,
}: {
  work: WorkWithDetail;
  viewer: WorkViewer;
  locale: AppLocale;
  slug: string;
}): Promise<WorkDetailsData> {
  const { voices, grants } = viewer;

  const t = await getTranslations("work");
  const format = await getFormatter();

  // Construit WorkAccessInput du domaine (src/domain/types.ts) à partir de la Work
  const workAccessInput = buildWorkAccessInput(
    work.id,
    work.movements,
    new Map(voices.map((voice) => [voice.id, voice.code])),
  );

  // Résout les droits de l'utilisateur sur l'œuvre entière, par mouvement et par pupitre
  const access: WorkAccess = resolveWorkAccess(workAccessInput, grants);

  const resolved = resolvePublishedWorkTranslation(work, locale);

  // Libellé traduit d'un pupitre (repli sur le code brut si non connu) -
  // callback injecté dans le view-model, pas d'import direct de next-intl là-bas.
  function getVoiceLabel(code: string): string {
    return isKnownVoiceCode(code) ? t(`voice.${code}`) : code;
  }

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

  // Où revenir si la session a expiré entre le rendu et le clic : le bouton
  // d'une piste non possédée est grisé, seul ce cas mène à la connexion.
  const downloadReturnTo = getPathname({
    href: { pathname: "/works/[slug]", params: { slug } },
    locale,
  });

  const viewModel = buildWorkPageViewModel({
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

  return {
    title: resolved.title,
    description: resolved.description,
    access,
    viewModel,
    movementVoiceAccess,
    downloadReturnTo,
  };
}

export { buildWorkDetailsData, loadWorkViewer };
export type { WorkDetailsData, WorkViewer };
