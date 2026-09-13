import { getTranslations } from "next-intl/server";

import { AccessSidebar } from "@/features/work/components/access-sidebar";
import { CollapsibleAccessPanel } from "@/features/work/components/collapsible-access-panel";
import { StudioPlaceholder } from "@/features/work/components/studio-placeholder";
import { WorkDownloadsSection } from "@/features/work/components/work-downloads-section";
import { WorkHeader } from "@/features/work/components/work-header";
import { WorkOffersSection } from "@/features/work/components/work-offers-section";
import type { WorkWithDetail } from "@/features/work/server/published-work";
import type { WorkDetailsData } from "@/features/work/server/work-details-data";
import { Container } from "@/shared/components/site/container";
import { Link } from "@/i18n/navigation";

/**
 * Contenu de la page d'une œuvre.
 *
 * @remarks
 * Compose l'en-tête, le panneau d'accès, les téléchargements et les offres à
 * partir de données déjà préparées : aucune requête ni résolution de droits
 * ici.
 *
 * @param work - Œuvre publiée.
 * @param data - Données préparées par buildWorkDetailsData.
 * @returns La page rendue.
 */
async function WorkDetailsPage({
  work,
  data,
}: {
  work: WorkWithDetail;
  data: WorkDetailsData;
}) {
  const tWorkPage = await getTranslations("work.workPage");
  const tCommon = await getTranslations("common");
  const tNav = await getTranslations("navigation");

  const { access, viewModel, movementVoiceAccess } = data;

  const sidebar = (
    <AccessSidebar
      movements={movementVoiceAccess}
      hasTuttiDownload={viewModel.hasTuttiDownload}
      hasAccompanimentDownload={viewModel.hasAccompanimentDownload}
    />
  );

  return (
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
            {data.title}
          </span>
        </nav>

        <WorkHeader
          work={work}
          title={data.title}
          description={data.description}
        />

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

        <WorkDownloadsSection
          viewModel={viewModel}
          returnTo={data.downloadReturnTo}
        />

        {/* Étendre votre accès : absent si l'oeuvre est déjà possédée en
            intégralité. */}
        {!access.ownsFullWork ? (
          <WorkOffersSection
            viewModel={viewModel}
            movementsCount={work.movements.length}
          />
        ) : null}
      </Container>
    </section>
  );
}

export { WorkDetailsPage };
