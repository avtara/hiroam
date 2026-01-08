"use client";

import { useState } from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Coins,
  Tag,
  CheckCircle,
  AlertCircle,
  X,
  AlertTriangle,
  Loader2,
  Copy,
} from "lucide-react";
import { useX402Availability } from "@/hooks/use-x402-availability";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelector";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { DiscountCode } from "@/types/database";
import type { AppliedCoupon } from "@/stores/cart-store";
import { formatPriceForCurrency } from "@/stores/currency-store";

interface CheckoutFormData {
  email: string;
  fullName: string;
}

interface BuyerInformationCardProps {
  register: UseFormRegister<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  userEmail?: string;
  currency: string;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  promoCode: string | null;
  appliedCoupon: AppliedCoupon | null;
  isCouponValid: boolean;
  validCouponDiscount: number;
  subtotal: number;
  onApplyCoupon: (coupon: AppliedCoupon, discount: number) => void;
  onRemovePromo: () => void;
  isAnonymous: boolean;
  onAnonymousChange: (isAnonymous: boolean) => void;
  anonymousOrderId?: string;
}

export function BuyerInformationCard({
  register,
  errors,
  userEmail,
  currency,
  paymentMethod,
  onPaymentMethodChange,
  promoCode,
  appliedCoupon,
  isCouponValid,
  validCouponDiscount,
  subtotal,
  onApplyCoupon,
  onRemovePromo,
  isAnonymous,
  onAnonymousChange,
  anonymousOrderId,
}: BuyerInformationCardProps) {
  const { isX402Available } = useX402Availability();
  const [promoInput, setPromoInput] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const supabase = createClient();

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;

    setIsApplyingPromo(true);
    setPromoError(null);

    try {
      console.log("[Checkout] Applying promo code:", promoInput.toUpperCase());

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000),
      );

      const queryPromise = supabase
        .from("discount_codes")
        .select("*")
        .eq("code", promoInput.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      const { data, error } = (await Promise.race([
        queryPromise,
        timeoutPromise,
      ])) as Awaited<typeof queryPromise>;

      console.log("[Checkout] Promo query result:", { data, error });

      if (error) {
        console.error("[Checkout] Promo query error:", error);
        setPromoError("An error occurred while validating the promo code");
        return;
      }

      if (!data) {
        setPromoError("Promo code is invalid or no longer active");
        return;
      }

      const promo = data as DiscountCode;

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        setPromoError("Promo code has expired");
        return;
      }

      if (promo.starts_at && new Date(promo.starts_at) > new Date()) {
        setPromoError("Promo code is not yet active");
        return;
      }

      if (promo.max_uses && (promo.current_uses || 0) >= promo.max_uses) {
        setPromoError("Promo code has reached its usage limit");
        return;
      }

      if (promo.discount_type === "fixed") {
        if (promo.currency_code === "USD" && currency !== "USD") {
          setPromoError(`This promo code is only valid for USD payments`);
          return;
        }
        if (promo.currency_code === "IDR" && currency !== "IDR") {
          setPromoError(`This promo code is only valid for IDR payments`);
          return;
        }
        if (
          currency === "USD" &&
          !promo.discount_value &&
          promo.discount_value_idr
        ) {
          setPromoError(`This promo code is only valid for IDR payments`);
          return;
        }
        if (
          currency === "IDR" &&
          promo.discount_value &&
          !promo.discount_value_idr
        ) {
          setPromoError(`This promo code is only valid for USD payments`);
          return;
        }
      }

      const effectiveSubtotal = subtotal;
      if (currency === "USD") {
        const subtotalCents = effectiveSubtotal * 10000;
        if (
          promo.min_purchase_cents &&
          subtotalCents < promo.min_purchase_cents
        ) {
          setPromoError(
            `Minimum purchase ${formatPriceForCurrency(
              promo.min_purchase_cents,
              0,
              "USD",
            )}`,
          );
          return;
        }
      } else {
        if (
          promo.min_purchase_idr &&
          effectiveSubtotal < promo.min_purchase_idr
        ) {
          setPromoError(
            `Minimum purchase ${formatPriceForCurrency(
              0,
              promo.min_purchase_idr,
              "IDR",
            )}`,
          );
          return;
        }
      }

      const couponData: AppliedCoupon = {
        code: promo.code,
        discountType: promo.discount_type as "percentage" | "fixed",
        discountValue: promo.discount_value,
        discountValueIdr: promo.discount_value_idr,
        currencyCode: promo.currency_code,
        maxDiscountCents: promo.max_discount_cents,
        maxDiscountIdr: promo.max_discount_idr,
      };

      let discount = 0;
      if (promo.discount_type === "percentage") {
        discount = (effectiveSubtotal * promo.discount_value) / 100;
        if (currency === "USD" && promo.max_discount_cents) {
          discount = Math.min(discount, promo.max_discount_cents / 10000);
        } else if (currency === "IDR" && promo.max_discount_idr) {
          discount = Math.min(discount, promo.max_discount_idr);
        }
      } else {
        if (currency === "USD") {
          discount = promo.discount_value / 10000;
        } else {
          discount = promo.discount_value_idr || 0;
        }
      }

      onApplyCoupon(couponData, discount);
      toast.success(`Promo code ${promo.code} applied successfully!`);
      setPromoInput("");
    } catch (err) {
      console.error("[Checkout] Promo error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      if (errorMessage === "Request timeout") {
        setPromoError("Connection timeout. Please try again.");
      } else {
        setPromoError("An error occurred. Please try again.");
      }
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-medium mb-2">Buyer Information</h2>
        <p className="text-xs text-muted-foreground">
          Enter your details so we can deliver your eSIM and keep you updated
          about your order.
        </p>
      </div>

      {/* Standard/Anonymous Toggle */}
      <div>
        <div className="inline-flex h-auto bg-muted p-2 rounded-full">
          <button
            type="button"
            onClick={() => onAnonymousChange(false)}
            className={`rounded-full px-6 py-4 transition-all ${
              !isAnonymous
                ? "bg-white text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground"
            }`}
          >
            Standard Checkout
          </button>
          <button
            type="button"
            onClick={() => onAnonymousChange(true)}
            className={`rounded-full px-6 py-2 transition-all ${
              isAnonymous
                ? "bg-white text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground"
            }`}
          >
            Anonymous Mode
          </button>
        </div>
      </div>

      {isAnonymous ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="orderId" className="text-base font-normal">
              Order ID
            </Label>
            <div className="relative">
              <Input
                id="orderId"
                value={anonymousOrderId || "Generating..."}
                readOnly
                className="bg-gray-50 pr-10"
              />
              {anonymousOrderId && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(anonymousOrderId);
                    toast.success("Order ID copied to clipboard");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Even if you&apos;re logged in, this order won&apos;t be recorded on
            your account. Copy this{" "}
            <a
              href={`/check-order${anonymousOrderId ? `?order_id=${anonymousOrderId}` : ""}`}
              className="text-teal-600 hover:underline"
            >
              order id
            </a>{" "}
            to keep track of your order.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName" className="text-base font-normal">
              Name
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              {...register("fullName")}
              className="bg-gray-50"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-base font-normal">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@gmail.com"
              {...register("email")}
              disabled={!!userEmail}
              className="bg-gray-50"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Payment Method */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Payment Method</h3>
          <p className="text-sm text-muted-foreground">
            Choose your preferred payment option and complete your purchase
            securely.
          </p>
        </div>

        {/* Payment Method Selector */}
        {currency === "USD" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onPaymentMethodChange("paddle")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                paymentMethod === "paddle"
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <CreditCard className="h-6 w-6 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-base">Credit Card</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Visa, Master Card, etc
                  </p>
                </div>
                <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5">
                  {paymentMethod === "paddle" && (
                    <div className="h-3 w-3 rounded-full bg-teal-500" />
                  )}
                </div>
              </div>
            </button>

            {isX402Available && (
              <button
                type="button"
                onClick={() => onPaymentMethodChange("x402")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  paymentMethod === "x402"
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Coins className="h-6 w-6 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-base">Crypto Payment</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Solana
                    </p>
                  </div>
                  <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5">
                    {paymentMethod === "x402" && (
                      <div className="h-3 w-3 rounded-full bg-teal-500" />
                    )}
                  </div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Promo Code Section */}
      <div>
        <div className="bg-gray-100 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Apply your voucher here to get instant discounts on your order.
          </p>
          <div>
            {promoCode ? (
              <div className="space-y-3">
                {isCouponValid ? (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-teal-50 border-2 border-teal-500">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-teal-600" />
                      <p className="font-medium text-teal-700">
                        Voucher Discount{" "}
                        {currency === "USD"
                          ? formatPriceForCurrency(
                              validCouponDiscount * 10000,
                              0,
                              "USD",
                            )
                          : formatPriceForCurrency(
                              0,
                              validCouponDiscount,
                              "IDR",
                            )}
                      </p>
                    </div>
                    <button
                      onClick={onRemovePromo}
                      className="text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        Kupon "{promoCode}" tidak berlaku untuk {currency}.
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemovePromo}
                        className="ml-2"
                      >
                        Hapus
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter voucher code"
                    value={promoInput}
                    onChange={(e) =>
                      setPromoInput(e.target.value.toUpperCase())
                    }
                    disabled={isApplyingPromo}
                    className="bg-white border-0"
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={isApplyingPromo}
                  >
                    {isApplyingPromo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {promoError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {promoError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
