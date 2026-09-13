import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette du formulaire d'édition d'une oeuvre.
 *
 * @returns Le squelette rendu.
 */
export default function EditWorkLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Chargement…
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-28 rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {["h-64", "h-48", "h-80"].map((hauteur) => (
            <Skeleton key={hauteur} className={`${hauteur} rounded-2xl`} />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
