import type { Location, Country, Region } from "@/types/location";

// Popular countries for featured section
export const POPULAR_COUNTRY_CODES = [
  "JP", // Japan
  "KR", // South Korea
  "TH", // Thailand
  "SG", // Singapore
  "MY", // Malaysia
  "ID", // Indonesia
  "US", // United States
  "GB", // United Kingdom
  "AU", // Australia
  "FR", // France
  "DE", // Germany
  "IT", // Italy
];

// Region definitions with their identifiers
export const REGIONS: Region[] = [
  {
    code: "global",
    name: "Global",
    type: "region",
    countryCount: 120,
    iconUrl: "/img/regions/global.svg",
    popular: true,
  },
  {
    code: "europe",
    name: "Europe",
    type: "region",
    countryCount: 42,
    iconUrl: "/img/regions/europe.svg",
    popular: true,
  },
  {
    code: "asia",
    name: "Asia",
    type: "region",
    countryCount: 20,
    iconUrl: "/img/regions/asia.svg",
    popular: true,
  },
  {
    code: "north-america",
    name: "North America",
    type: "region",
    countryCount: 3,
    iconUrl: "/img/regions/north-america.svg",
  },
  {
    code: "south-america",
    name: "South America",
    type: "region",
    countryCount: 17,
    iconUrl: "/img/regions/south-america.svg",
  },
  {
    code: "africa",
    name: "Africa",
    type: "region",
    countryCount: 29,
    iconUrl: "/img/regions/africa.svg",
  },
  {
    code: "middle-east",
    name: "Middle East",
    type: "region",
    countryCount: 12,
    iconUrl: "/img/regions/middle-east.svg",
  },
  {
    code: "oceania",
    name: "Australia & Oceania",
    type: "region",
    countryCount: 2,
    iconUrl: "/img/regions/oceania.svg",
  },
  {
    code: "caribbean",
    name: "Caribbean",
    type: "region",
    countryCount: 25,
    iconUrl: "/img/regions/caribbean.svg",
  },
  {
    code: "gcc",
    name: "GCC Countries",
    type: "region",
    countryCount: 6,
    iconUrl: "/img/regions/gcc.svg",
  },
];

// Map region slug patterns to region codes
export function getRegionCodeFromSlug(slug: string): string | null {
  const lowerSlug = slug.toLowerCase();

  if (lowerSlug.includes("global")) return "global";
  if (lowerSlug.startsWith("eu-") || lowerSlug.includes("europe"))
    return "europe";
  if (lowerSlug.startsWith("as-") || lowerSlug.includes("asia")) return "asia";
  if (lowerSlug.includes("north") && lowerSlug.includes("america"))
    return "north-america";
  if (lowerSlug.includes("south") && lowerSlug.includes("america"))
    return "south-america";
  if (lowerSlug.startsWith("af-") || lowerSlug.includes("africa"))
    return "africa";
  if (lowerSlug.includes("middle") || lowerSlug.includes("mena"))
    return "middle-east";
  if (lowerSlug.includes("aunz") || lowerSlug.includes("oceania"))
    return "oceania";
  if (lowerSlug.includes("caribbean") || lowerSlug.includes("carib"))
    return "caribbean";
  if (lowerSlug.includes("gcc") || lowerSlug.includes("gulf")) return "gcc";

  return null;
}

// Get flag URL for a country code (fallback to local flags)
export function getFlagUrl(countryCode: string): string {
  return `/img/flags/${countryCode.toLowerCase()}.png`;
}

// Get image URL with proper handling for API URLs
// Returns the logo URL from DB or falls back to local flag
export function getLocationImageUrl(
  logoUrl: string | undefined | null,
  countryCode: string
): string {
  // If we have a logo URL from the API/DB
  if (logoUrl) {
    // Already an absolute URL (from API)
    if (logoUrl.startsWith("http")) {
      return logoUrl;
    }

    // Any other relative path
    return logoUrl;
  }
  // Fallback to local flag
  return `https://purecatamphetamine.github.io/country-flag-icons/3x2/${countryCode.toUpperCase()}.svg`;
}

// Extract country name from package name
export function extractCountryName(packageName: string): string {
  // Remove data spec from end (e.g., "Japan 1GB 7Days" -> "Japan")
  return packageName.replace(/\s+\d+(\.\d+)?(GB|MB).*$/i, "").trim();
}

// Sort locations alphabetically with popular first
export function sortLocations<T extends Location>(locations: T[]): T[] {
  return [...locations].sort((a, b) => {
    // Popular items first
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

// Group countries by first letter for alphabet navigation
export function groupCountriesByLetter(
  countries: Country[]
): Record<string, Country[]> {
  const grouped: Record<string, Country[]> = {};

  countries.forEach((country) => {
    const firstLetter = country.name.charAt(0).toUpperCase();
    if (!grouped[firstLetter]) {
      grouped[firstLetter] = [];
    }
    grouped[firstLetter].push(country);
  });

  // Sort countries within each group
  Object.keys(grouped).forEach((letter) => {
    grouped[letter].sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

// Filter locations by search query
export function filterLocations<T extends Location>(
  locations: T[],
  query: string
): T[] {
  if (!query.trim()) return locations;

  const lowerQuery = query.toLowerCase().trim();
  return locations.filter(
    (location) =>
      location.name.toLowerCase().includes(lowerQuery) ||
      location.code.toLowerCase().includes(lowerQuery)
  );
}
