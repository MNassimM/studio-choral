import { Container } from "@/components/layout/container";
import { LoadingStatus } from "@/components/layout/loading-status";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la page oeuvre, affiché dès le clic.
 *
 * @returns Le squelette rendu.
 */
export default function WorkLoading() {
  return (
    <section className="mx-auto max-w-7xl bg-background">
      <Container className="flex flex-col gap-10 pt-2 pb-14 sm:pt-6">
        <LoadingStatus />
        <Skeleton className="h-4 w-64" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] md:items-start">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>

        {["h-32", "h-56"].map((hauteur) => (
          <div key={hauteur} className="flex flex-col gap-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className={`${hauteur} w-full rounded-xl`} />
          </div>
        ))}
      </Container>
    </section>
  );
}
