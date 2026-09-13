import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette de la liste des oeuvres en administration.
 *
 * @remarks
 * Le back-office est en français en dur, l'annonce aussi.
 *
 * @returns Le squelette rendu.
 */
export default function AdminWorksLoading() {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        Chargement…
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-44 rounded-full" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 min-w-64 flex-1 rounded-full" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
