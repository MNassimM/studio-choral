import { getTranslations } from "next-intl/server";
import { CheckCircle2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SidebarVoiceView } from "@/lib/works/work-page-view-model";
import type { WorkAccess } from "@/types/domain";

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

export { AccessSidebar };
