import { getLocale } from "next-intl/server";

import { WorkForm } from "@/components/admin/work-form";
import { redirect } from "@/i18n/navigation";
import { createWork } from "@/lib/admin/work-actions";
import {
  emptyWorkFormDraft,
  type WorkActionResult,
} from "@/lib/admin/work-form-draft";
import type { WorkFormValues } from "@/lib/admin/work-form-schema";

// Elle montre des brouillons et dépend du rôle, donc jamais de cache.
export const dynamic = "force-dynamic";

/**
 * Crée l'oeuvre puis emmène vers sa page de modification.
 */
async function creer(values: WorkFormValues): Promise<WorkActionResult> {
  "use server";

  const result = await createWork(values);
  if (result.ok) {
    // Ne revient jamais, on quitte la page de création.
    redirect({
      href: { pathname: "/admin/works/[id]", params: { id: result.workId } },
      locale: await getLocale(),
    });
  }
  return result;
}

/**
 * Page de création d'une oeuvre.
 */
export default function NewWorkPage() {
  return (
    <WorkForm
      mode="create"
      initialValues={emptyWorkFormDraft()}
      submitAction={creer}
    />
  );
}
