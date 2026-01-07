"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BorderedContainer } from "@/components/bordered-container";
import { DestinationCard } from "@/components/landing/destination-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type {
  LocationWithPackageCount,
  RegionWithPackageCount,
} from "@/services/locations";

interface AllDestinationsProps {
  countries: LocationWithPackageCount[];
  regions: RegionWithPackageCount[];
  innerClassName?: string;
  borderClassName?: string;
  centerHeader?: boolean;
}

function RegionDestinationCard({
  name,
  code,
  price,
  href,
}: {
  name: string;
  code: string;
  price: number;
  href?: string;
}) {
  const cardContent = (
    <Card className="relative rounded-2xl bg-white transition-all hover:shadow-md hover:border-primary/40">
      <CardContent className="p-6">
        {/* Main Content */}
        <div className="pr-20">
          {/* Globe Icon */}
          <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Globe className="h-7 w-7 text-primary" />
          </div>

          {/* Region Name */}
          <h3 className="mt-5 min-h-16 text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
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

function AlphabetFilter({
  alphabet,
  selectedLetter,
  onSelectLetter,
  countriesByLetter,
}: {
  alphabet: string[];
  selectedLetter: string;
  onSelectLetter: (letter: string) => void;
  countriesByLetter: Record<string, LocationWithPackageCount[]>;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => onSelectLetter("ALL")}
          className={[
            "shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-colors",
            selectedLetter === "ALL"
              ? "border-primary text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
          ].join(" ")}
        >
          All
        </button>
        {alphabet.map((letter) => {
          const hasResults = (countriesByLetter[letter]?.length ?? 0) > 0;
          const active = selectedLetter === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onSelectLetter(letter)}
              disabled={!hasResults}
              className={[
                "shrink-0 h-12 w-12 rounded-full border text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50",
                !hasResults ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AllDestinations({
  countries,
  regions,
  innerClassName,
  borderClassName,
  centerHeader = false,
}: AllDestinationsProps) {
  const [selectedLetter, setSelectedLetter] = useState<string>("ALL");

  // Get popular countries
  const popularCountries = countries.filter((c) => c.popular);

  // Get all countries
  const allCountries = countries;

  // Get all regions
  const allRegions = regions;

  const isPopularVisible = popularCountries.length > 0;
  const isCountryVisible = allCountries.length > 0;
  const isRegionVisible = allRegions.length > 0;

  // Determine default tab
  const defaultTab = isPopularVisible
    ? "popular"
    : isCountryVisible
      ? "countries"
      : isRegionVisible
        ? "regions"
        : "global";

  const isHideTabs =
    [isPopularVisible, isCountryVisible, isRegionVisible].filter(Boolean)
      .length === 1;

  // Group countries by first letter for alphabet filtering
  const countriesByLetter = useMemo(() => {
    const grouped: Record<string, LocationWithPackageCount[]> = {};
    allCountries.forEach((country) => {
      const letter = country.name.charAt(0).toUpperCase();
      (grouped[letter] ||= []).push(country);
    });
    return grouped;
  }, [allCountries]);

  const alphabet = useMemo(
    () => Object.keys(countriesByLetter).sort(),
    [countriesByLetter],
  );

  // Filter countries based on selected letter
  const filteredCountries = useMemo(() => {
    const list =
      selectedLetter === "ALL"
        ? allCountries
        : (countriesByLetter[selectedLetter] ?? []);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [allCountries, countriesByLetter, selectedLetter]);

  return (
    <section>
      <AllDestinationsHeader centered={centerHeader} />

      <Tabs
        defaultValue={defaultTab}
        onValueChange={() => setSelectedLetter("ALL")}
      >
        <TabsList
          className="h-auto bg-transparent p-0 gap-3"
          hidden={isHideTabs}
        >
          <TabsTrigger
            value="popular"
            hidden={!isPopularVisible}
            className="rounded-full px-5 py-2 border border-border data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Popular
          </TabsTrigger>
          <TabsTrigger
            value="countries"
            hidden={!isCountryVisible}
            className="rounded-full px-5 py-2 border border-border data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Countries
          </TabsTrigger>
          <TabsTrigger
            value="regions"
            hidden={!isRegionVisible}
            className="rounded-full px-5 py-2 border border-border data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Regions
          </TabsTrigger>
          <TabsTrigger
            value="global"
            hidden={!isCountryVisible}
            className="rounded-full px-5 py-2 border border-border data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Global
          </TabsTrigger>
        </TabsList>

        {/* Popular Tab */}
        <TabsContent value="popular" className="mt-6">
          <BorderedContainer
            className={borderClassName}
            innerClassName={innerClassName}
          >
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              {popularCountries.map((country) => (
                <DestinationCard
                  key={country.code}
                  name={country.name}
                  code={country.code.toLowerCase()}
                  flag=""
                  price={country.minPriceUsdCents / 10000}
                  href={`/store/${country.code.toLowerCase()}`}
                />
              ))}
            </div>
          </BorderedContainer>
        </TabsContent>

        {/* Countries Tab */}
        <TabsContent value="countries" className="mt-6">
          <AlphabetFilter
            alphabet={alphabet}
            selectedLetter={selectedLetter}
            onSelectLetter={setSelectedLetter}
            countriesByLetter={countriesByLetter}
          />
          <BorderedContainer
            className={borderClassName}
            innerClassName={innerClassName}
          >
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
              {filteredCountries.map((country) => (
                <DestinationCard
                  key={country.code}
                  name={country.name}
                  code={country.code.toLowerCase()}
                  flag=""
                  price={country.minPriceUsdCents / 10000}
                  href={`/store/${country.code.toLowerCase()}`}
                />
              ))}
            </div>
          </BorderedContainer>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="mt-6">
          <BorderedContainer
            className={borderClassName}
            innerClassName={innerClassName}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allRegions.map((region) => (
                <RegionDestinationCard
                  key={region.code}
                  name={region.name}
                  code={region.code}
                  price={region.minPriceUsdCents / 10000}
                  href={`/store/region/${region.code}`}
                />
              ))}
            </div>
          </BorderedContainer>
        </TabsContent>

        {/* Global Tab - Same as Countries with alphabet filter */}
        <TabsContent value="global" className="mt-6">
          <AlphabetFilter
            alphabet={alphabet}
            selectedLetter={selectedLetter}
            onSelectLetter={setSelectedLetter}
            countriesByLetter={countriesByLetter}
          />
          <BorderedContainer
            className={borderClassName}
            innerClassName={innerClassName}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCountries.map((country) => (
                <DestinationCard
                  key={country.code}
                  name={country.name}
                  code={country.code.toLowerCase()}
                  flag=""
                  price={country.minPriceUsdCents / 10000}
                  href={`/store/${country.code.toLowerCase()}`}
                />
              ))}
            </div>
          </BorderedContainer>
        </TabsContent>
      </Tabs>
    </section>
  );
}

export function AllDestinationsHeader({
  centered = false,
}: {
  centered?: boolean;
}) {
  return (
    <div className={`mb-6 ${centered ? "text-center" : ""}`}>
      <h2 className="text-5xl font-normal leading-12 tracking-normal">
        <span className="text-primary">All</span>{" "}
        <span className="text-foreground">Destinations</span>
      </h2>
      <p className="mt-2 text-muted-foreground">
        Browse all available destinations and find the perfect eSIM for your
        trip
      </p>
    </div>
  );
}
