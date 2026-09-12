"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

/**
 * Vérifie aproximativemnt la forme d'une adresse e-mail.
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
 * Seule partie cliente de la page de connexion, Tout le reste est rendu côté serveur.
 *
 * @param initialError - Message d'erreur à afficher au premier rendu, transmis
 * par la page lorsqu'Auth.js a rejeté un lien.
 * @param nextTarget - Chemin interne où ramener l'utilisateur une fois connecté,
 * déjà validé par la page. Il est confié à Auth.js, qui l'inscrit dans le lien
 * magique, de sorte que la destination reste connue meme dans le lien reçu par e-mail.
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
        ...(nextTarget && nextTarget !== "/" ? { redirectTo: nextTarget } : {}),
      });

      if (result?.error) {
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
