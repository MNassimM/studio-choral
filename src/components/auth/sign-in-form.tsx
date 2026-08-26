"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

/**
 * Vérifie sommairement la forme d'une adresse e-mail.
 *
 * @remarks
 * Le contrôle reste volontairement large. La validité réelle d'une adresse ne
 * se prouve qu'en lui envoyant un message, et rejeter localement une adresse
 * exotique mais légitime serait pire que de laisser partir un envoi qui
 * n'aboutira pas. Il ne s'agit donc que d'attraper les fautes de frappe
 * évidentes avant un aller retour réseau inutile.
 *
 * @param value - Adresse saisie par l'utilisateur.
 * @returns Vrai si l'adresse a une forme plausible.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Formulaire de demande de lien de connexion.
 *
 * @remarks
 * Seule partie cliente de la page de connexion, le reste demeurant rendu côté
 * serveur. L'envoi utilise l'option sans redirection d'Auth.js afin que la
 * navigation reste maîtrisée ici, ce qui permet d'atteindre la page de
 * confirmation dans la bonne locale plutôt qu'un chemin fixe.
 *
 * La page de confirmation est atteinte même lorsque l'envoi échoue côté
 * fournisseur, car distinguer les deux cas révélerait si l'adresse correspond
 * à un compte connu.
 *
 * @param initialError - Message d'erreur à afficher au premier rendu, transmis
 * par la page lorsqu'Auth.js a rejeté un lien.
 * @param nextTarget - Chemin interne où ramener l'utilisateur une fois connecté,
 * déjà validé par la page. Il est confié à Auth.js, qui l'inscrit dans le lien
 * magique, de sorte que la destination survive au passage par la boîte mail.
 * @returns Le formulaire rendu.
 */
function SignInForm({
  initialError,
  nextTarget,
}: {
  initialError?: string;
  nextTarget?: string;
}) {
  const t = useTranslations("auth.signIn");
  const router = useRouter();
  const emailFieldId = useId();
  const errorMessageId = useId();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Le double envoi est bloqué ici plutôt que par le seul attribut disabled,
    // qui ne couvre pas une soumission déclenchée au clavier pendant l'envoi.
    if (isSubmitting) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("errorEmailRequired"));
      return;
    }
    if (!looksLikeEmail(trimmed)) {
      setError(t("errorEmailInvalid"));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("magic-link", {
        email: trimmed,
        redirect: false,
        // Transmis à Auth.js plutôt que conservé ici : le clic sur le lien a
        // lieu bien plus tard, souvent depuis un autre onglet, et l'état de
        // ce composant aura disparu depuis longtemps.
        ...(nextTarget && nextTarget !== "/" ? { redirectTo: nextTarget } : {}),
      });

      if (result?.error) {
        // Auth.js signale un refus du callback de connexion sous le code
        // AccessDenied. C'est aujourd'hui la seule chose qui puisse le
        // produire ici, la limitation de débit étant le seul motif de refus.
        //
        // Le message reste identique quelle que soit l'adresse saisie : une
        // adresse connue et une adresse inconnue sont limitées de la même
        // façon, la limite ne portant pas sur l'existence d'un compte.
        const isRateLimited =
          result.error === "AccessDenied" || result.code === "AccessDenied";

        setError(
          isRateLimited ? t("errorTooManyRequests") : t("errorSendFailed"),
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/verification");
    } catch {
      setError(t("errorSendFailed"));
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailFieldId} className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <Input
          id={emailFieldId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          placeholder={t("emailPlaceholder")}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorMessageId : undefined}
          className="h-11 rounded-lg"
        />
      </div>

      {/* La zone est présente en permanence et annoncée poliment. Un message
          inséré dans un conteneur créé au même moment ne serait pas relu par
          une partie des lecteurs d'écran. */}
      <p
        id={errorMessageId}
        role="alert"
        aria-live="polite"
        className="min-h-5 text-sm text-destructive empty:min-h-0"
      >
        {error}
      </p>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full rounded-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {t("noAccountNotice")}
      </p>
    </form>
  );
}

export { SignInForm };
