"use client";

import { ShoppingCart, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDataSize } from "@/lib/utils";
import { formatPriceForCurrency } from "@/stores/currency-store";
import { isUnlimitedPackage, getDataTypeLabel } from "@/types/location";
import type { CartItem } from "@/stores/cart-store";

interface OrderItemsCardProps {
  items: CartItem[];
  currency: string;
  itemPrices: Map<
    string,
    {
      finalUsdCents: number;
      finalIdr: number;
      originalUsdCents: number;
      originalIdr: number;
      hasDiscount: boolean;
      badgeText?: string;
      badgeColor?: string;
    }
  >;
}

export function OrderItemsCard({
  items,
  currency,
  itemPrices,
}: OrderItemsCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6">
      <h3 className="text-lg font-medium mb-4">
        <ShoppingCart className="inline h-5 w-5 mr-2" />
        Pesanan Anda
      </h3>
      <div className="space-y-4">
        {items.map((item) => {
          const effectivePrice = itemPrices.get(item.package.id);
          const periodMultiplier = item.periodNum || 1;
          const totalMultiplier = item.quantity * periodMultiplier;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {item.package.display_name || item.package.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDataSize(item.package.volume_bytes)} •{" "}
                  {item.periodNum ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.periodNum} Hari
                    </span>
                  ) : (
                    <>
                      {item.package.duration}{" "}
                      {item.package.duration_unit === "day"
                        ? "Hari"
                        : item.package.duration_unit || "Hari"}
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.package.category && (
                    <Badge variant="outline">{item.package.category}</Badge>
                  )}
                  {isUnlimitedPackage(item.package.data_type) && (
                    <Badge variant="secondary" className="text-xs">
                      {getDataTypeLabel(item.package.data_type)}
                    </Badge>
                  )}
                  {effectivePrice?.hasDiscount && effectivePrice.badgeText && (
                    <Badge
                      variant="secondary"
                      style={
                        effectivePrice.badgeColor
                          ? {
                              backgroundColor: effectivePrice.badgeColor,
                              color: "white",
                            }
                          : undefined
                      }
                    >
                      {effectivePrice.badgeText}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                {effectivePrice?.hasDiscount && (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatPriceForCurrency(
                      effectivePrice.originalUsdCents * totalMultiplier,
                      effectivePrice.originalIdr * totalMultiplier,
                      currency
                    )}
                  </p>
                )}
                <p className="font-semibold">
                  {effectivePrice
                    ? formatPriceForCurrency(
                        effectivePrice.finalUsdCents * totalMultiplier,
                        effectivePrice.finalIdr * totalMultiplier,
                        currency
                      )
                    : formatPriceForCurrency(
                        item.package.price_usd_cents * totalMultiplier,
                        item.package.price_idr * totalMultiplier,
                        currency
                      )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.periodNum && `${item.periodNum} hari`}
                  {item.periodNum && item.quantity > 1 && " × "}
                  {item.quantity > 1 && `x${item.quantity}`}
                  {!item.periodNum &&
                    item.quantity === 1 &&
                    `x${item.quantity}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
