import { getTranslations } from "next-intl/server";

/**
 * Annonce aux lecteurs d'écran qu'une page est en cours de chargement.
 *
 * @returns Le message, invisible à l'écran.
 */
async function LoadingStatus() {
  const t = await getTranslations("common");

  return (
    <p role="status" className="sr-only">
      {t("loading")}
    </p>
  );
}

export { LoadingStatus };
