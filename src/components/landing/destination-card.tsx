import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountryFlag } from "@/components/country-flag";
import { EsimBadge } from "@/components/ui/esim-badge";
import { cn } from "@/lib/utils";
interface DestinationCardProps {
  name: string;
  code: string;
  flag: string;
  price: number;
  href?: string;
  className?: string;
}

export function DestinationCard({
  name,
  code,
  flag,
  price,
  href,
  className,
}: DestinationCardProps) {
  const cardContent = (
    <Card
      className={cn(
        "relative rounded-2xl bg-white transition-all hover:shadow-md hover:border-primary/40",
        className,
      )}
    >
      <CardContent className="p-6">
        {/* ESIM Badge - Top Right (hidden on mobile) */}
        <EsimBadge className="absolute top-6 right-6 hidden sm:block" />

        {/* Mobile Compact Layout */}
        <div className="flex flex-col sm:hidden">
          {/* Flag */}
          <CountryFlag code={code} name={name} size={56} />

          {/* Country */}
          <h3 className="mt-4 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>

          {/* Price */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Starting from</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">
                ${price}
              </span>
              <span className="text-sm text-muted-foreground">/7 days</span>
            </div>
          </div>
        </div>

        {/* Desktop Layout (hidden on mobile) */}
        <div className="hidden sm:block">
          {/* Main Content */}
          <div className="pr-20">
            {/* Flag */}
            <CountryFlag code={code} name={name} size={56} />

            {/* Country */}
            <h3 className="mt-5 truncate text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>

            {/* Price */}
            <div className="mt-8">
              <p className="text-base text-muted-foreground">Starting from</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-foreground">
                  ${price}
                </span>
                <span className="text-base text-muted-foreground">/7 days</span>
              </div>
            </div>
          </div>

          {/* Arrow Button - Bottom Right */}
          <div className="absolute bottom-6 right-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white transition-colors group-hover:border-primary/40">
              <ArrowRight className="h-5 w-5 text-foreground group-hover:text-primary" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="group">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
