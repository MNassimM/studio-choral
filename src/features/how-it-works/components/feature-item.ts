import type { LucideIcon } from "lucide-react";
import type { getTranslations } from "next-intl/server";

/**
 * Clés de message des blocs illustrés de la page.
 *
 * @remarks
 * Union explicite plutôt qu'une chaîne libre, pour que les clés composées en
 * Title et en Description restent vérifiables par next-intl.
 */
type FeatureMessageKey =
  | "browseCatalog"
  | "listenExtracts"
  | "chooseOffer"
  | "checkout"
  | "findWorks"
  | "downloadFiles"
  | "listenOnline"
  | "customize"
  | "workEfficiently"
  | "progress"
  | "pleasure"
  | "secureAccess"
  | "unlimitedDownloads"
  | "updatesIncluded"
  | "needHelp";

/**
 * Bloc illustré de la page, associant une icône à ses clés de message.
 *
 * @remarks
 * Le champ est nommé messageKey et non key, un champ key étant intercepté par
 * React au lieu d'être transmis comme prop lors de la diffusion en JSX.
 */
type FeatureItem = {
  icon: LucideIcon;
  messageKey: FeatureMessageKey;
};

type HowItWorksTranslator = Awaited<
  ReturnType<typeof getTranslations<"howItWorks">>
>;

export type { FeatureItem, FeatureMessageKey, HowItWorksTranslator };
