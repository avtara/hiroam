"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Wifi, Clock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderedContainer } from "@/components/bordered-container";
import { NumericStepper } from "@/components/numeric-stepper";
import { useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { formatDataSize } from "@/lib/utils";
import type { EsimPackage } from "@/types/database";
import {
  calculateEffectivePrice,
  formatPriceWithDiscount,
  centsToUsd,
  type PriceSchedule,
} from "@/lib/price-utils";
import { toast } from "sonner";
import { getDataTypeLabel } from "@/types/location";

interface UnlimitedPackagesProps {
  packages: EsimPackage[];
  countryName: string;
  priceSchedules: PriceSchedule[];
}

export function UnlimitedPackages({
  packages,
  countryName,
  priceSchedules,
}: UnlimitedPackagesProps) {
  const currency = useCurrencyStore((state) => state.currency);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  // Group packages by data type (FUP level)
  const groupedByDataType = useMemo(() => {
    const grouped = new Map<number, EsimPackage[]>();
    packages.forEach((pkg) => {
      if (pkg.data_type) {
        const existing = grouped.get(pkg.data_type) || [];
        existing.push(pkg);
        grouped.set(pkg.data_type, existing);
      }
    });
    // Sort packages within each group by volume
    grouped.forEach((pkgs, key) => {
      grouped.set(
        key,
        pkgs.sort((a, b) => (a.volume_bytes || 0) - (b.volume_bytes || 0)),
      );
    });
    return grouped;
  }, [packages]);

  // Get available data types
  const dataTypes = useMemo(
    () => Array.from(groupedByDataType.keys()).sort(),
    [groupedByDataType],
  );

  const [selectedDataType, setSelectedDataType] = useState<number>(
    dataTypes[0] || 2,
  );
  const [selectedPackage, setSelectedPackage] = useState<EsimPackage | null>(
    null,
  );
  const [days, setDays] = useState(8);

  // Get packages for selected data type
  const availablePackages = groupedByDataType.get(selectedDataType) || [];

  // Set initial package when data type changes
  useMemo(() => {
    if (availablePackages.length > 0 && !selectedPackage) {
      setSelectedPackage(availablePackages[0]);
    }
  }, [availablePackages, selectedPackage]);

  // Calculate effective price
  const effectivePrice = useMemo(() => {
    if (!selectedPackage) return null;
    return calculateEffectivePrice(
      selectedPackage.id,
      selectedPackage.price_usd_cents,
      selectedPackage.price_idr,
      priceSchedules,
    );
  }, [selectedPackage, priceSchedules]);

  const formatted = useMemo(() => {
    if (!effectivePrice) return null;
    return formatPriceWithDiscount(effectivePrice, currency);
  }, [effectivePrice, currency]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!selectedPackage || !effectivePrice) return "$0.00";

    const pricePerDay =
      currency === "USD"
        ? centsToUsd(effectivePrice.finalUsdCents)
        : effectivePrice.finalIdr;

    const total = pricePerDay * days;

    return currency === "USD"
      ? `$${total.toFixed(2)}`
      : `Rp${Math.round(total).toLocaleString("id-ID")}`;
  }, [selectedPackage, effectivePrice, days, currency]);

  const handleAddToCart = () => {
    if (!selectedPackage) return;
    addItem(selectedPackage);
    toast.success(
      `${selectedPackage.display_name || selectedPackage.name} ditambahkan ke keranjang`,
    );
  };

  const handleCheckout = () => {
    if (!selectedPackage) return;
    // Create temporary cart with only this item
    const tempCart = {
      items: [selectedPackage],
      quantity: 1,
    };
    // Navigate to checkout with the selected package
    router.push(`/checkout?item=${selectedPackage.id}`);
  };

  const incrementDays = () => setDays((prev) => Math.min(prev + 1, 365));
  const decrementDays = () => setDays((prev) => Math.max(prev - 1, 1));

  if (packages.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          Tidak ada paket unlimited tersedia untuk negara ini.
        </p>
      </div>
    );
  }

  return (
    <BorderedContainer className="bg-transparent">
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left side - Customization */}
          <div className="space-y-6 bg-white rounded-3xl p-6">
            <h2 className="text-2xl font-medium">
              Customize your unlimited plan
            </h2>

            {/* Days Selection */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm">Total Active Days</h3>
                  <p className="text-sm text-muted-foreground">
                    You can adjust plan for the total active days
                  </p>
                </div>

                <NumericStepper
                  value={days}
                  onIncrement={incrementDays}
                  onDecrement={decrementDays}
                  min={1}
                  max={365}
                  label="Days"
                  size="sm"
                />
              </div>
            </div>

            {/* FUP Selection */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">FUP</h3>
              <p className="text-sm text-muted-foreground">
                Select FUP per day
              </p>

              <div className="space-y-2">
                {availablePackages.map((pkg) => {
                  // Calculate total cost for this package
                  const pkgEffectivePrice = calculateEffectivePrice(
                    pkg.id,
                    pkg.price_usd_cents,
                    pkg.price_idr,
                    priceSchedules,
                  );
                  const pricePerDay =
                    currency === "USD"
                      ? centsToUsd(pkgEffectivePrice.finalUsdCents)
                      : pkgEffectivePrice.finalIdr;
                  const totalCost = pricePerDay * days;

                  const pricePerDayFormatted =
                    currency === "USD"
                      ? `$${pricePerDay.toFixed(2)}`
                      : `Rp${Math.round(pricePerDay).toLocaleString("id-ID")}`;

                  const totalCostFormatted =
                    currency === "USD"
                      ? `$${totalCost.toFixed(2)}`
                      : `Rp${Math.round(totalCost).toLocaleString("id-ID")}`;

                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={[
                        "w-full p-4 rounded-xl border-2 text-left transition-all",
                        selectedPackage?.id === pkg.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-white hover:border-primary/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {formatDataSize(pkg.volume_bytes)}/day
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pricePerDayFormatted}/day
                            {days > 1 && ` (${totalCostFormatted})`}
                          </p>
                        </div>
                        <div
                          className={[
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            selectedPackage?.id === pkg.id
                              ? "border-primary"
                              : "border-muted-foreground",
                          ].join(" ")}
                        >
                          {selectedPackage?.id === pkg.id && (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right side - Plan Summary */}
          <div className="space-y-4 bg-white rounded-3xl p-6 self-start">
            <h2 className="text-2xl font-medium">Plan summary</h2>

            {selectedPackage && (
              <>
                <Badge className="bg-blue-100 text-blue-600 hover:bg-blue-100 text-sm">
                  {getDataTypeLabel(selectedPackage.data_type)}
                </Badge>

                {/* Data per day */}
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="text-2xl font-medium">
                      {formatDataSize(selectedPackage.volume_bytes)}
                    </span>
                    <span className="text-muted-foreground text-lg">
                      {" "}
                      MB/day
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-medium">{days} Days</span>
                </div>

                {/* Price */}
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="text-3xl font-medium">{totalPrice}</p>
                </div>

                {/* Divider */}
                <div className="border-t border-border pt-4" />

                {/* Stepper and Action Buttons */}
                <div className="flex flex-row items-stretch md:items-center gap-3">
                  <NumericStepper
                    value={1}
                    onIncrement={() => {}}
                    onDecrement={() => {}}
                    min={1}
                    size="sm"
                  />
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddToCart}
                    className="md:flex-none rounded-full md:min-w-[120px]"
                  >
                    Add to Cart
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCheckout}
                    className="md:flex-none rounded-full bg-teal-600 hover:bg-teal-700 md:min-w-[120px]"
                  >
                    Checkout {totalPrice}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </BorderedContainer>
  );
}
