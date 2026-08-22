import frCommon from "../../messages/fr/common.json";
import frNavigation from "../../messages/fr/navigation.json";
import frHome from "../../messages/fr/home.json";
import frCatalogue from "../../messages/fr/catalogue.json";
import frWork from "../../messages/fr/work.json";
import frErrors from "../../messages/fr/errors.json";
import frStudio from "../../messages/fr/studio.json";
import frLibrary from "../../messages/fr/library.json";
import frCart from "../../messages/fr/cart.json";
import frCheckout from "../../messages/fr/checkout.json";
import frAccount from "../../messages/fr/account.json";
import frAuth from "../../messages/fr/auth.json";

import enCommon from "../../messages/en/common.json";
import enNavigation from "../../messages/en/navigation.json";
import enHome from "../../messages/en/home.json";
import enCatalogue from "../../messages/en/catalogue.json";
import enWork from "../../messages/en/work.json";
import enErrors from "../../messages/en/errors.json";
import enStudio from "../../messages/en/studio.json";
import enLibrary from "../../messages/en/library.json";
import enCart from "../../messages/en/cart.json";
import enCheckout from "../../messages/en/checkout.json";
import enAccount from "../../messages/en/account.json";
import enAuth from "../../messages/en/auth.json";

/**
 * Assemble les fichiers par fonctionnalité en un seul arbre de messages par
 * locale. Imports statiques (pas un import dynamique `.../${locale}/${ns}.json`
 * à deux variables) : plus sûr pour l'analyse statique de Turbopack, et
 * permet à TypeScript d'inférer la forme exacte plutôt que Record<string, any>.
 *
 * home.json exporte deux namespaces indépendants ({ home, howItWorks }) et
 * est donc étalé (...frHome) plutôt qu'assigné sous une seule clé - les
 * autres fichiers correspondent chacun à exactement un namespace, nommé
 * d'après le fichier.
 */
const fr = {
  ...frHome,
  common: frCommon,
  navigation: frNavigation,
  catalogue: frCatalogue,
  work: frWork,
  errors: frErrors,
  studio: frStudio,
  library: frLibrary,
  cart: frCart,
  checkout: frCheckout,
  account: frAccount,
  auth: frAuth,
};

// `satisfies typeof fr`, pas `: typeof fr` : échoue au typecheck si un
// fichier en/*.json a une clé en trop, en moins, ou de forme différente par
// rapport à son équivalent fr/*.json - un filet de sécurité qui n'existait
// pas avec l'ancien fichier unique (chargé dynamiquement, typé en any).
const en = {
  ...enHome,
  common: enCommon,
  navigation: enNavigation,
  catalogue: enCatalogue,
  work: enWork,
  errors: enErrors,
  studio: enStudio,
  library: enLibrary,
  cart: enCart,
  checkout: enCheckout,
  account: enAccount,
  auth: enAuth,
} satisfies typeof fr;

export const messagesByLocale = { fr, en };
