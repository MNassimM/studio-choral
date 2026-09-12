import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Racine publique du bucket des images de couverture.
 *
 * @remarks
 * Exigée ici, et pas seulement à l'exécution : `next/image` refuse d'optimiser
 * une image dont l'hôte n'est pas déclaré, et la déclaration se fait au
 * démarrage. Échouer maintenant avec un message clair vaut mieux que des
 * pochettes silencieusement absentes.
 */
const couvertures = process.env.R2_PUBLIC_BASE_URL;
if (!couvertures) {
  throw new Error(
    "R2_PUBLIC_BASE_URL est requise : elle déclare l'hôte des images de couverture. Voir .env.example.",
  );
}

const nextConfig: NextConfig = {
  images: {
    // Seul ce bucket est autorisé. Tout autre hôte reçoit un 400, ce qui
    // évite que le site serve d'optimiseur d'images à des tiers.
    remotePatterns: [new URL(`${couvertures}/**`)],
  },
};

export default withNextIntl(nextConfig);
