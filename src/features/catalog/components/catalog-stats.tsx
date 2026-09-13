import { getTranslations } from "next-intl/server";
import { BookOpen, Headphones, Music2, Users2 } from "lucide-react";

import type { CatalogPageContent } from "@/features/catalog/server/catalog-page-data";

/**
 * Encart d'une statistique du catalogue.
 *
 * @param icon - Icône illustrant la statistique.
 * @param value - Valeur affichée.
 * @param label - Intitulé de la statistique.
 * @returns L'encart rendu.
 */
function StatBox({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/**
 * Statistiques globales du catalogue, avant filtrage.
 *
 * @param stats - Nombres d'œuvres, de compositeurs et de fichiers audio.
 * @returns La grille des statistiques.
 */
async function CatalogStats({ stats }: { stats: CatalogPageContent["stats"] }) {
  const t = await getTranslations("catalogue");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatBox
        icon={BookOpen}
        value={String(stats.worksCount)}
        label={t("statWorksAvailable")}
      />
      <StatBox
        icon={Users2}
        value={String(stats.composersCount)}
        label={t("statComposers")}
      />
      <StatBox
        icon={Music2}
        value={String(stats.audioFilesCount)}
        label={t("statAudioFiles")}
      />
      {/*
            <StatBox
              icon={Music2}
              value={t("statVoicingValue")}
              label={t("statVoicingLabel")}
            />*/}
      <StatBox
        icon={Headphones}
        value={t("statAudioValue")}
        label={t("statAudioLabel")}
      />
    </div>
  );
}

export { CatalogStats };
