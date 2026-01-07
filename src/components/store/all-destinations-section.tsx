import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCountriesWithPackages,
  getRegionsWithPackages,
} from "@/services/locations";
import { AllDestinationsHeader, AllDestinations } from "./all-destinations";

function AllDestinationsSkeleton() {
  return (
    <section className="mb-12">
      <div className="mb-6">
        <AllDestinationsHeader />
      </div>
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </section>
  );
}

type Props = {
  innerClassName?: string;
  borderClassName?: string;
  centerHeader?: boolean;
};

export function AllDestinationsSection(props: Props) {
  return (
    <Suspense fallback={<AllDestinationsSkeleton />}>
      <AllDestinationsSectionAsync {...props} />
    </Suspense>
  );
}

async function AllDestinationsSectionAsync({
  innerClassName,
  borderClassName,
  centerHeader,
}: Props) {
  const [countries, regions] = await Promise.all([
    getCountriesWithPackages(),
    getRegionsWithPackages(),
  ]);

  return (
    <AllDestinations
      countries={countries}
      regions={regions}
      innerClassName={innerClassName}
      borderClassName={borderClassName}
      centerHeader={centerHeader}
    />
  );
}
