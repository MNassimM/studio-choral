import "server-only";

import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { EmailConfig } from "@auth/core/providers/email";

import { MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/auth/env";
import { sendEmail } from "@/lib/email/send-email";
import { MagicLinkEmail } from "@/emails/magic-link";
import { renderEmail } from "@/emails/render";
import { SITE_NAME } from "@/emails/theme";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Provider "lien magique" MAISON
 */

/**
 * Détermine la locale à utiliser pour l'e-mail de lien magique.
 *
 * @remarks
 * Le handler Auth.js s'exécute en dehors de [locale] et ne dispose donc pas du contexte de langue de la page.
 * On recupere donc depuis le cookie NEXT_LOCALE
 *
 * TODO : peut etre mettre la valeur dans un callback ou attribut caché du formulaire?
 *
 * @param request - Requête HTTP ayant déclenché l'envoi du lien magique.
 * @returns La locale valide à utiliser pour traduire l'e-mail.
 */
function resolveLocale(request: Request): AppLocale {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(cookieHeader);
  const candidate = match?.[1] ? decodeURIComponent(match[1]) : undefined;

  return hasLocale(routing.locales, candidate)
    ? candidate
    : routing.defaultLocale;
}

/**
 * Configuration du provider de lien magique utilisé par Auth.js
 */
export const magicLinkProvider: EmailConfig = {
  id: "magic-link",
  type: "email",
  name: "Lien de connexion",

  /**
   * Durée de validité du LIEN (calcule l'expiration du VerificationToken).
   */
  maxAge: MAGIC_LINK_MAX_AGE_SECONDS,

  /**
   * Valeur requise par le contrat EmailConfig, mais non utilisée pour déterminer l'expéditeur réel (on utilise EMAIL_FROM_ADDRESS)
   */
  from: "(non utilisé - voir EMAIL_FROM_ADDRESS)",

  
  /**
   * Normalise l'adresse e-mail utilisée par Auth.js.
   *
   * @param identifier - Adresse e-mail fournie par l'utilisateur.
   * @returns Adresse e-mail normalisée.
   * @throws {Error} Si l'adresse ne contient pas de partie locale ou de domaine.
   */
  normalizeIdentifier(identifier: string): string {
    const [localPart, domain] = identifier.toLowerCase().trim().split("@");
    if (!localPart || !domain) {
      throw new Error("Adresse e-mail invalide");
    }
    return `${localPart}@${domain}`;
  },


  /**
   * Envoie le lien magique de connexion à l'utilisateur.
   *
   * @param identifier - Adresse e-mail à laquelle envoyer le lien.
   * @param url - URL complète du lien magique généré par Auth.js.
   * @param request - Requête ayant déclenché la demande de connexion.
   * @throws {Error} Si l'envoi du lien échoue.
   */
  async sendVerificationRequest({ identifier, url, request }) {
    const locale = resolveLocale(request);
    const t = await getTranslations({ locale, namespace: "auth.magicLinkEmail" });

    const minutes = Math.round(MAGIC_LINK_MAX_AGE_SECONDS / 60);

    const { html, text } = await renderEmail(
      <MagicLinkEmail
        locale={locale}
        url={url}
        preview={t("preview", { minutes })}
        heading={t("heading", { siteName: SITE_NAME })}
        greeting={t("greeting")}
        instruction={t("instruction", { siteName: SITE_NAME })}
        buttonLabel={t("buttonLabel")}
        fallbackNotice={t("fallbackNotice")}
        expiry={t("expiry", { minutes })}
        ignore={t("ignore")}
        signature={t("signature", { siteName: SITE_NAME })}
      />,
    );

    const result = await sendEmail({
      to: identifier,
      subject: t("subject", { siteName: SITE_NAME }),
      text,
      html,
    });

    if (!result.ok) {
      throw new Error(`Envoi du lien de connexion impossible : ${result.error}`);
    }
  },
};
