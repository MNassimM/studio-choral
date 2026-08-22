import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

/**
 * Link/useRouter/usePathname/redirect/getPathname conscients des locales et
 * des segments traduits (routing.pathnames). RÈGLE ABSOLUE : tout lien
 * interne passe par ce Link, jamais par next/link - un <Link> natif
 * contournerait la réécriture des segments et produirait des 404 en anglais.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
