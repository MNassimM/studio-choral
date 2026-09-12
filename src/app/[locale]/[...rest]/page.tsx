import { notFound } from "next/navigation";

/**
 * Route de repli d'une locale.
 *
 * @remarks
 * Bascule en 404 pour toute URL inconnue, dont les routes déclarées dans le
 * routage mais pas encore implémentées.
 *
 * @returns Rien, la fonction interrompt le rendu.
 */
export default function CatchAllPage() {
  notFound();
}
