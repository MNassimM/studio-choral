import type { Prisma } from "@/generated/prisma/client";
import { productKey } from "@/lib/admin/work/work-products";

/**
 * Le calcul des changements à appliquer à une oeuvre.
 *
 * @remarks
 * Fonctions PURES : elles reçoivent l'état lu en base et le brouillon, et
 * rendent un plan. Rien n'est écrit ici, aucun accès base, aucun accès
 * stockage. C'est ce qui rend la réconciliation vérifiable sans base, alors
 * qu'elle vivait auparavant au milieu d'une transaction.
 */

/** Une offre telle que buildProductRows la fabrique. */
export type ProductRow = Prisma.ProductCreateManyWorkInput;

// ─── Mouvements ──────────────────────────────────────────────────────────────

/** Un mouvement déjà en base. */
export type ExistingMovement = { id: string; title: string };

/** Un mouvement du brouillon, sans id s'il vient d'être ajouté. */
export type DraftMovement = { id?: string | null; title: string };

/** Ce qu'il faut faire aux mouvements d'une oeuvre. */
export type MovementPlan = {
  /** Mouvements en base que le brouillon ne porte plus. */
  doomed: ExistingMovement[];
  /** Déplacements temporaires à appliquer avant les positions finales. */
  parking: { id: string; position: number; slug: string }[];
  /** Mouvements conservés, dans leur état final. */
  updates: { id: string; slug: string; title: string; position: number }[];
  /** Mouvements à créer, dans leur état final. */
  creations: { slug: string; title: string; position: number }[];
};

/**
 * Calcule ce qu'il faut faire aux mouvements d'une oeuvre.
 *
 * @remarks
 * Le passage par des positions temporaires n'est pas une précaution : la
 * contrainte unique (workId, position) refuserait tout réordonnancement qui
 * ferait, ne serait ce qu'un instant, coexister deux mouvements sur la même
 * position. Les valeurs négatives ne peuvent entrer en conflit avec aucune
 * position finale, qui part de zéro.
 *
 * @param existing - Mouvements actuellement en base pour cette oeuvre.
 * @param draft - Mouvements du brouillon, dans l'ordre voulu.
 * @param slugs - Slugs déjà dédoublonnés, un par mouvement du brouillon.
 * @returns Le plan, à appliquer dans l'ordre de ses champs.
 */
export function planMovements(
  existing: readonly ExistingMovement[],
  draft: readonly DraftMovement[],
  slugs: readonly string[],
): MovementPlan {
  const keptIds = draft
    .map((movement) => movement.id)
    .filter((id): id is string => Boolean(id));
  const conserves = new Set(keptIds);

  const doomed = existing.filter((movement) => !conserves.has(movement.id));

  const parking = keptIds.map((id, index) => ({
    id,
    position: -1 - index,
    slug: `tmp-${index}-${id}`,
  }));

  const updates: MovementPlan["updates"] = [];
  const creations: MovementPlan["creations"] = [];

  draft.forEach((movement, index) => {
    const valeurs = {
      slug: slugs[index],
      title: movement.title,
      position: index,
    };
    if (movement.id) updates.push({ id: movement.id, ...valeurs });
    else creations.push(valeurs);
  });

  return { doomed, parking, updates, creations };
}

// ─── Offres ──────────────────────────────────────────────────────────────────

/** Une offre déjà en base, réduite à ce qui l'identifie. */
export type ExistingProduct = {
  id: string;
  movementId: string | null;
  voiceId: string | null;
  coverage: string;
};

/** Ce qu'il faut faire aux offres d'une oeuvre. */
export type ProductPlan = {
  /** Offres que le catalogue n'engendre plus, à retirer sans supprimer. */
  retiredIds: string[];
  /** Offres existantes à réécrire, retrait levé au passage. */
  updates: { id: string; name: string; priceCents: number; position: number }[];
  /** Offres encore inexistantes. */
  creations: ProductRow[];
};

/**
 * Calcule ce qu'il faut faire aux offres d'une oeuvre.
 *
 * @remarks
 * Une offre n'est JAMAIS supprimée, seulement retirée : un droit acheté peut
 * la référencer, et l'historique doit rester lisible. Une offre de nouveau
 * engendrée sort de son retrait, son activation restant tranchée ailleurs,
 * sur les pistes réellement présentes.
 *
 * @param existing - Offres actuellement en base pour cette oeuvre.
 * @param wanted - Offres que le catalogue engendre à partir du brouillon.
 * @returns Le plan, à appliquer dans l'ordre de ses champs.
 */
export function planProducts(
  existing: readonly ExistingProduct[],
  wanted: readonly ProductRow[],
): ProductPlan {
  const parCoordonnees = new Map(
    existing.map((product) => [
      productKey(product.movementId, product.voiceId, product.coverage),
      product.id,
    ]),
  );

  const voulus = new Set(
    wanted.map((row) =>
      productKey(row.movementId ?? null, row.voiceId ?? null, row.coverage),
    ),
  );

  const retiredIds = existing
    .filter(
      (product) =>
        !voulus.has(
          productKey(product.movementId, product.voiceId, product.coverage),
        ),
    )
    .map((product) => product.id);

  const updates: ProductPlan["updates"] = [];
  const creations: ProductRow[] = [];

  for (const row of wanted) {
    const existant = parCoordonnees.get(
      productKey(row.movementId ?? null, row.voiceId ?? null, row.coverage),
    );

    if (existant) {
      updates.push({
        id: existant,
        name: row.name,
        priceCents: row.priceCents,
        position: row.position,
      });
    } else {
      creations.push(row);
    }
  }

  return { retiredIds, updates, creations };
}

// ─── Pistes d'un pupitre retiré ──────────────────────────────────────────────

/** Une piste en base, réduite à ce qu'il faut pour décider de son sort. */
export type ExistingTrack = {
  id: string;
  storageKey: string;
  voiceId: string | null;
};

/** Ce qu'il faut faire aux pistes d'un pupitre qui n'est plus retenu. */
export type TrackPurgePlan = {
  /** Pistes à supprimer, ligne et objet. */
  doomed: ExistingTrack[];
  /** Pupitres concernés, pour la garde des droits déjà vendus. */
  voiceIds: string[];
};

/**
 * Calcule les pistes qu'un retrait de pupitre laisse orphelines.
 *
 * @remarks
 * Le filtre est fait en mémoire, jamais par un notIn SQL sur une colonne
 * nullable : en SQL, voiceId NOT IN (...) vaut NULL pour une piste sans
 * pupitre, ce qui écarterait silencieusement les tutti et accompagnements,
 * dont le voiceId est justement nul.
 *
 * @param tracks - Toutes les pistes de l'oeuvre.
 * @param retainedVoiceIds - Pupitres que l'oeuvre retient encore.
 * @returns Le plan de purge, vide quand aucun pupitre n'a été retiré.
 */
export function planRetiredVoiceTracks(
  tracks: readonly ExistingTrack[],
  retainedVoiceIds: readonly string[],
): TrackPurgePlan {
  const retenus = new Set(retainedVoiceIds);

  const doomed = tracks.filter(
    (piste) => piste.voiceId !== null && !retenus.has(piste.voiceId),
  );

  const voiceIds = [...new Set(doomed.map((piste) => piste.voiceId as string))];

  return { doomed, voiceIds };
}
