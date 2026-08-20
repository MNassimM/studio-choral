import type { routing } from "@/i18n/routing";
import type { messagesByLocale } from "@/i18n/messages";

// Augmentation next-intl : `Messages` basé sur l'arbre fr assemblé dans
// src/i18n/messages.ts (source de vérité des clés), `Locale` restreint aux
// locales déclarées. Une clé absente ou mal orthographiée dans un appel
// useTranslations/getTranslations devient une erreur `npm run typecheck`,
// jamais une chaîne "namespace.key" affichée à l'écran en production.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messagesByLocale.fr;
  }
}
