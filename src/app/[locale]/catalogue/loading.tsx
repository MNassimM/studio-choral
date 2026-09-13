import { Container } from "@/shared/components/site/container";
import { LoadingStatus } from "@/shared/components/site/loading-status";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette du catalogue, affiché en arrivant sur la page.
 *
 * @remarks
 * Ne couvre que l'arrivée. Trier, filtrer ou paginer restent sur la même
 * page et passent par CatalogResults, qui estompe les résultats en place.
 *
 * @returns Le squelette rendu.
 */
export default function CatalogueLoading() {
  return (
    <section className="mx-auto max-w-7xl bg-background">
      <Container className="flex flex-col gap-8 pt-2 pb-12 sm:pt-6 sm:pb-16">
        <LoadingStatus />
        <Skeleton className="h-4 w-40" />

        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-full rounded-full sm:max-w-md" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-48 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-xl border border-border"
            >
              <Skeleton className="h-40 rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-3 h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
