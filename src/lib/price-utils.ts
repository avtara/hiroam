import type { CurrencyCode } from "@/stores/currency-store";

/**
 * Convert esim-access price format to USD dollars
 * In esim-access format: 10000 = $1.00 USD
 */
export function centsToUsd(cents: number): number {
  return cents / 10000;
}

/**
 * Convert USD dollars to esim-access price format
 * In esim-access format: 10000 = $1.00 USD
 */
export function usdToCents(dollars: number): number {
  return dollars * 10000;
}

export interface PriceSchedule {
  id: string;
  package_id: string | null;
  schedule_name: string;
  schedule_type: "price_override" | "discount";
  discount_type: "percentage" | "fixed" | null;
  discount_value: number | null;
  override_price_usd_cents: number | null;
  override_price_idr: number | null;
  starts_at: string;
  ends_at: string;
  priority: number;
  badge_text: string | null;
  badge_color: string | null;
  is_active: boolean;
}

export interface EffectivePrice {
  originalUsdCents: number;
  originalIdr: number;
  finalUsdCents: number;
  finalIdr: number;
  hasDiscount: boolean;
  discountPercentage: number | null;
  badgeText: string | null;
  badgeColor: string | null;
  scheduleName: string | null;
}

/**
 * Calculate effective price for a package based on active price schedules
 */
export function calculateEffectivePrice(
  packageId: string,
  originalUsdCents: number,
  originalIdr: number,
  schedules: PriceSchedule[],
): EffectivePrice {
  const now = new Date();

  // Find applicable schedules for this package (sorted by priority desc)
  const applicableSchedules = schedules
    .filter((schedule) => {
      // Check if schedule is active
      if (!schedule.is_active) return false;

      // Check date range
      const startsAt = new Date(schedule.starts_at);
      const endsAt = new Date(schedule.ends_at);
      if (now < startsAt || now > endsAt) return false;

      // Check if applies to this package or all packages
      if (schedule.package_id !== null && schedule.package_id !== packageId) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.priority - a.priority);

  // No applicable schedule - return original prices
  if (applicableSchedules.length === 0) {
    return {
      originalUsdCents,
      originalIdr,
      finalUsdCents: originalUsdCents,
      finalIdr: originalIdr,
      hasDiscount: false,
      discountPercentage: null,
      badgeText: null,
      badgeColor: null,
      scheduleName: null,
    };
  }

  // Apply the highest priority schedule
  const schedule = applicableSchedules[0];

  let finalUsdCents = originalUsdCents;
  let finalIdr = originalIdr;
  let discountPercentage: number | null = null;

  if (schedule.schedule_type === "price_override") {
    // Price override
    if (schedule.override_price_usd_cents !== null) {
      finalUsdCents = schedule.override_price_usd_cents;
    }
    if (schedule.override_price_idr !== null) {
      finalIdr = schedule.override_price_idr;
    }
    // Calculate discount percentage for display
    if (originalUsdCents > 0) {
      discountPercentage = Math.round(
        ((originalUsdCents - finalUsdCents) / originalUsdCents) * 100,
      );
    }
  } else if (schedule.schedule_type === "discount") {
    // Discount type
    if (schedule.discount_type === "percentage" && schedule.discount_value) {
      discountPercentage = schedule.discount_value;
      finalUsdCents = Math.round(
        originalUsdCents * (1 - schedule.discount_value / 100),
      );
      finalIdr = Math.round(originalIdr * (1 - schedule.discount_value / 100));
    } else if (schedule.discount_type === "fixed" && schedule.discount_value) {
      // Fixed discount in cents for USD
      finalUsdCents = Math.max(0, originalUsdCents - schedule.discount_value);
      // For IDR, we might need a separate discount value
      // For now, calculate IDR proportionally
      if (originalUsdCents > 0) {
        const discountRatio = finalUsdCents / originalUsdCents;
        finalIdr = Math.round(originalIdr * discountRatio);
      }
    }
  }

  return {
    originalUsdCents,
    originalIdr,
    finalUsdCents,
    finalIdr,
    hasDiscount: finalUsdCents < originalUsdCents || finalIdr < originalIdr,
    discountPercentage,
    badgeText: schedule.badge_text,
    badgeColor: schedule.badge_color,
    scheduleName: schedule.schedule_name,
  };
}

/**
 * Format price with optional strikethrough for original price
 */
export function formatPriceWithDiscount(
  effectivePrice: EffectivePrice,
  currency: CurrencyCode,
): { original: string; final: string; hasDiscount: boolean } {
  const formatUsd = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(cents / 10000); // esim-access format: 1 USD = 10000

  const formatIdr = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  if (currency === "USD") {
    return {
      original: formatUsd(effectivePrice.originalUsdCents),
      final: formatUsd(effectivePrice.finalUsdCents),
      hasDiscount: effectivePrice.hasDiscount,
    };
  }

  return {
    original: formatIdr(effectivePrice.originalIdr),
    final: formatIdr(effectivePrice.finalIdr),
    hasDiscount: effectivePrice.hasDiscount,
  };
}

/**
 * Get effective price value for calculations
 */
export function getEffectivePrice(
  effectivePrice: EffectivePrice,
  currency: CurrencyCode,
): number {
  if (currency === "USD") {
    return effectivePrice.finalUsdCents / 10000; // esim-access format: 1 USD = 10000
  }
  return effectivePrice.finalIdr;
}
