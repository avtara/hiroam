"use client";

import { Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericStepper } from "@/components/numeric-stepper";
import { formatDataSize } from "@/lib/utils";
import type { EsimPackage } from "@/types/database";

interface FloatingPackageBarProps {
  selectedPackage: EsimPackage;
  quantity: number;
  totalPrice: number;
  currency: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onAddToCart: () => void;
  onCheckoutOnly: () => void;
}

export function FloatingPackageBar({
  selectedPackage,
  quantity,
  totalPrice,
  currency,
  onIncrement,
  onDecrement,
  onAddToCart,
  onCheckoutOnly,
}: FloatingPackageBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-lg z-50 animate-in slide-in-from-bottom">
      <div className="container mx-auto max-w-6xl px-4 py-3 sm:py-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-6">
          {/* Left - Package Info */}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">Prepaid Plan</p>
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-foreground" />
              <span className="text-xl font-normal">
                {formatDataSize(selectedPackage.volume_bytes)} •{" "}
                {selectedPackage.duration} Day
                {selectedPackage.duration > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Center - Quantity Controls */}
          <NumericStepper
            value={quantity}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            min={1}
            label=""
            size="sm"
          />

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onAddToCart}>
              Add to Cart
            </Button>
            <Button
              type="button"
              onClick={onCheckoutOnly}
              className="bg-primary"
            >
              Checkout {currency === "USD" ? "$" : "Rp"}
              {currency === "USD"
                ? totalPrice.toFixed(2)
                : Math.round(totalPrice).toLocaleString("id-ID")}
            </Button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-3">
          {/* Top Row - Package Info and Stepper */}
          <div className="flex items-center justify-between gap-3">
            {/* Package Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Prepaid Plan</p>
              <div className="flex items-center gap-1.5">
                <Wifi className="h-4 w-4 text-foreground shrink-0" />
                <span className="text-sm font-normal truncate">
                  {formatDataSize(selectedPackage.volume_bytes)} •{" "}
                  {selectedPackage.duration} Day
                  {selectedPackage.duration > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Quantity Controls */}
            <NumericStepper
              value={quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              min={1}
              label=""
              size="sm"
            />
          </div>

          {/* Bottom Row - Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onAddToCart}
              className="w-full"
            >
              Add to Cart
            </Button>
            <Button
              type="button"
              onClick={onCheckoutOnly}
              className="bg-primary w-full"
            >
              Checkout {currency === "USD" ? "$" : "Rp"}
              {currency === "USD"
                ? totalPrice.toFixed(2)
                : Math.round(totalPrice).toLocaleString("id-ID")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
