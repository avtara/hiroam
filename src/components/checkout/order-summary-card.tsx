"use client";

import Link from "next/link";
import { Loader2, CreditCard, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatDataSize } from "@/lib/utils";
import type { CartItem } from "@/stores/cart-store";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelector";

interface OrderSummaryCardProps {
  className?: string;
  items: CartItem[];
  currency: string;
  subtotal: number;
  validCouponDiscount: number;
  total: number;
  isLoading: boolean;
  isCouponValid: boolean;
  promoCode: string | null;
  paymentMethod: PaymentMethod;
  itemPrices: Map<
    string,
    {
      finalUsdCents: number;
      finalIdr: number;
      originalUsdCents: number;
      originalIdr: number;
      hasDiscount: boolean;
    }
  >;
}

export function OrderSummaryCard({
  className,
  items,
  currency,
  subtotal,
  validCouponDiscount,
  total,
  isLoading,
  isCouponValid,
  promoCode,
  paymentMethod,
  itemPrices,
}: OrderSummaryCardProps) {
  return (
    <div className={cn("bg-gray-50 rounded-3xl p-6 self-start", className)}>
      <h2 className="text-2xl font-medium mb-2">Order Summary</h2>
      <p className="text-xs mb-6 text-muted-foreground  ">
        Review your selected plan, pricing, and total cost before completing
        your purchase.
      </p>
      <div className="space-y-6">
        {/* Package Items */}
        <div className="space-y-3">
          {items.map((item) => {
            const effectivePrice = itemPrices.get(item.package.id);
            const periodMultiplier = item.periodNum || 1;
            const totalMultiplier = item.quantity * periodMultiplier;
            const finalPrice = effectivePrice
              ? currency === "USD"
                ? (effectivePrice.finalUsdCents / 10000) * totalMultiplier
                : effectivePrice.finalIdr * totalMultiplier
              : currency === "USD"
                ? (item.package.price_usd_cents / 10000) * totalMultiplier
                : item.package.price_idr * totalMultiplier;

            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                        />
                      </svg>
                    </div>
                    <p className="text-2xl">
                      <span>
                        {formatDataSize(item.package.volume_bytes)
                          .split(" ")
                          .map((value, index) => (
                            <span
                              key={index}
                              className={
                                index === 0
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {value}
                              {index === 0 ? " " : " "}
                            </span>
                          ))}
                      </span>
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        •{" "}
                        {item.periodNum ? (
                          <span className="font-medium text-foreground">
                            {item.periodNum} Day
                          </span>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">
                              {item.package.duration}
                            </span>{" "}
                            {item.package.duration_unit === "DAY"
                              ? "Day"
                              : item.package.duration_unit || "Day"}
                          </>
                        )}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (x{item.quantity})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-muted-foreground mb-1">Price</p>
                    <p className="text-2xl font-semibold whitespace-nowrap">
                      {currency === "USD"
                        ? `$${finalPrice.toFixed(2)}`
                        : `Rp ${Math.round(finalPrice).toLocaleString("id-ID")}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>
              {currency === "USD"
                ? `$${subtotal.toFixed(2)}`
                : `Rp ${Math.round(subtotal).toLocaleString("id-ID")}`}
            </span>
          </div>

          {validCouponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Voucher</span>
              <span className="text-green-600">
                -
                {currency === "USD"
                  ? `$${validCouponDiscount.toFixed(2)}`
                  : `Rp ${Math.round(validCouponDiscount).toLocaleString("id-ID")}`}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-semibold">Total</span>
            <span className="text-2xl font-bold text-foreground">
              {currency === "USD"
                ? `$${total.toFixed(2)}`
                : `Rp ${Math.round(total).toLocaleString("id-ID")}`}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          type="submit"
          form="checkout-form"
          className="w-full bg-teal-500 hover:bg-teal-600 text-white"
          size="lg"
          disabled={isLoading || (promoCode !== null && !isCouponValid)}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : paymentMethod === "x402" ? (
            <Coins className="mr-2 h-4 w-4" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          Checkout
        </Button>

        {/* Terms Link */}
        <p className="text-xs text-center text-muted-foreground">
          Dengan melanjutkan, Anda menyetujui{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Syarat & Ketentuan
          </Link>{" "}
          kami.
        </p>
      </div>
    </div>
  );
}
