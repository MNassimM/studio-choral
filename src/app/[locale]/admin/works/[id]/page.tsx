import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { WorkAdminActions } from "@/components/admin/work-admin-actions";
import { WorkForm } from "@/components/admin/work-form";
import { redirect } from "@/i18n/navigation";
import { loadVoiceOptions } from "@/lib/admin/voice-options";
import {
  deleteWork,
  publishWork,
  unpublishWork,
  updateWork,
} from "@/lib/admin/work-actions";
import {
  workToDraft,
  type WorkActionResult,
} from "@/lib/admin/work-form-draft";
import type { WorkFormValues } from "@/lib/admin/work-form-schema";
import { prisma } from "@/lib/db/prisma";

// Elle montre des brouillons et dépend du rôle, donc jamais de cache.
export const dynamic = "force-dynamic";

/**
 * Page de modification d'une oeuvre.
 *
 * @param params - Identifiant de l'oeuvre à charger.
 * @returns La page rendue, ou une page introuvable.
 */
export default async function EditWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const voices = await loadVoiceOptions();

  const work = await prisma.work.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      composer: true,
      catalogueRef: true,
      shortDescription: true,
      description: true,
      period: true,
      voicing: true,
      language: true,
      composedYear: true,
      hasAccompaniment: true,
      isPublished: true,
      movements: {
        select: {
          id: true,
          title: true,
          // storageKey n'est jamais sélectionné, il ne quitte pas le serveur.
          audioFiles: {
            select: { id: true, type: true, voice: { select: { code: true } } },
          },
        },
        orderBy: { position: "asc" },
      },
      translations: {
        select: {
          locale: true,
          slug: true,
          title: true,
          shortDescription: true,
          description: true,
        },
      },
      products: {
        select: {
          scope: true,
          coverage: true,
          priceCents: true,
          isActive: true,
          voiceId: true,
          voice: { select: { code: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!work) notFound();

  /** Enregistre les modifications de cette oeuvre. */
  async function enregistrer(values: WorkFormValues) {
    "use server";
    return updateWork(id, values);
  }

  /** Supprime l'oeuvre puis revient à la liste. */
  async function supprimer(workId: string): Promise<WorkActionResult> {
    "use server";
    const result = await deleteWork(workId);
    if (result.ok) {
      redirect({ href: "/admin/works", locale: await getLocale() });
    }
    return result;
  }

  return (
    <div className="flex flex-col gap-6">
      <WorkForm
        mode="edit"
        initialValues={workToDraft(work)}
        voices={voices}
        submitAction={enregistrer}
        submitLabel="Enregistrer les modifications"
      />
      <WorkAdminActions
        workId={work.id}
        title={work.title}
        isPublished={work.isPublished}
        onPublish={publishWork}
        onUnpublish={unpublishWork}
        onDelete={supprimer}
      />
    </div>
  );
}
