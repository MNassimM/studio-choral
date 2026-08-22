import { getTranslations } from "next-intl/server";
import { CheckCircle2, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.625rem] font-medium",
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

type MovementVoiceAccess = {
  movementId: string;
  movementTitle: string;
  voices: { code: string; label: string; owned: boolean }[];
};

async function AccessSidebar({
  movements,
  hasTuttiDownload,
  hasAccompanimentDownload,
}: {
  movements: MovementVoiceAccess[];
  hasTuttiDownload: boolean;
  hasAccompanimentDownload: boolean;
}) {
  const t = await getTranslations("work.workPage");

  // Un mouvement unique n'a pas besoin de répéter son nom (déjà celui de
  // l'œuvre, affiché dans l'en-tête) : on montre alors directement ses
  // pupitres, comme si l'œuvre entière était "le mouvement".
  const isSingleMovement = movements.length === 1;
  const ownsAnything = movements.some((movement) =>
    movement.voices.some((voice) => voice.owned),
  );

  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur-sm">
      <h2 className="text-lg font-semibold">{t("sidebarHeading")}</h2>

      <div className="flex flex-col gap-3">
        {movements.map((movement) => (
          <div
            key={movement.movementId}
            className={cn(
              "flex flex-col gap-1.5",
              !isSingleMovement &&
                "border-b border-border/60 pb-3 last:border-b-0 last:pb-0",
            )}
          >
            {!isSingleMovement ? (
              <span className="text-sm font-medium">
                {movement.movementTitle}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {movement.voices.map((voice) => (
                <VoicePill
                  key={voice.code}
                  label={voice.label}
                  owned={voice.owned}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {ownsAnything ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("sidebarIncludesHeading")}
          </h3>
          <ul className="flex flex-col gap-1.5 text-[0.725rem]">
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
    </aside>
  );
}

export { AccessSidebar };
