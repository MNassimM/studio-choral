import { Container } from "@/shared/components/site/container";
import { LoadingStatus } from "@/shared/components/site/loading-status";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Squelette de la bibliothèque.
 *
 * @returns Le squelette rendu.
 */
export default function LibraryLoading() {
  return (
    <section className="mx-auto max-w-7xl bg-background">
      <Container className="flex flex-col gap-8 pt-2 pb-12 sm:pt-6 sm:pb-16">
        <LoadingStatus />
        <Skeleton className="h-4 w-40" />

        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 rounded-2xl border border-border p-4"
            >
              <Skeleton className="size-20 shrink-0 rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="hidden h-9 w-32 rounded-full sm:block" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
