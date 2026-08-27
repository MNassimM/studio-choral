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
 * Provider « lien magique » MAISON, déclaré directement au format
 * `EmailConfig` (type: "email") plutôt qu'en réutilisant les providers
 * `nodemailer`/`resend` d'Auth.js.
 *
 * Raison : ces providers importent leur propre client SMTP ou HTTP au niveau
 * module. Les utiliser tirerait une seconde voie d'envoi dans le projet, en
 * contradiction directe avec la raison d'être de src/lib/email : TOUT sortie
 * d'e-mail passe par `sendEmail()`, et le fournisseur reste interchangeable
 * derrière cette interface.
 *
 * Ce fichier n'importe donc NI nodemailer NI resend - seulement notre
 * interface.
 */

/**
 * Détermine la locale à utiliser pour l'e-mail de lien magique.
 *
 * @remarks
 * Le handler Auth.js s'exécute en dehors de [locale] et ne dispose donc pas du contexte de langue de la page.
 *
 * La locale est récupérée depuis le cookie `NEXT_LOCALE`, défini par le proxy next-intl. 
 *
 * TODO : quand la page de connexion existera, il sera plus fiable de lui faire porter explicitement la locale 
 * par exemple via un champ caché du formulaire ou le callbackUrl.
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
 * Configuration du provider de lien magique utilisé par Auth.js.
 *
 * @remarks
 * Le provider délègue l'envoi réel du message au module sendEmail().
 * Il ne connaît donc ni le fournisseur d'e-mails utilisé, ni sa configuration.
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
   * Valeur requise par le contrat EmailConfig, mais non utilisée pour déterminer l'expéditeur réel.
   *
   * @remarks
   * L'expéditeur est construit exclusivement par le module d'e-mail à partir de EMAIL_FROM_ADDRESS et EMAIL_FROM_NAME.
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
   * @remarks
   * L'e-mail est envoyé exclusivement via sendEmail(). Ce provider ne communique donc directement avec aucun fournisseur d'e-mails.
   * Le contenu du message est traduit dans la locale déterminée par resolveLocale().
   *
   * Les chaînes sont traduites ici puis transmises au gabarit, qui reste une
   * pure présentation sans dépendance à next-intl. Ce découpage permet de
   * relire un gabarit sans monter de contexte de requête, et il évite qu'un
   * futur message ait à réapprendre comment retrouver la langue du
   * destinataire.
   *
   * La durée affichée est calculée depuis MAGIC_LINK_MAX_AGE_SECONDS, la même
   * constante qui fixe l'expiration réelle du jeton. Annoncer une durée saisie
   * à la main finirait par contredire le comportement du lien.
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
