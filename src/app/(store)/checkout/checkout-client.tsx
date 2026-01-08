"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { useCurrencyStore } from "@/stores/currency-store";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import { BorderedContainer } from "@/components/bordered-container";
import {
  usePriceSchedules,
  calculateCartTotals,
} from "@/hooks/use-price-schedules";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelector";
import { X402PaymentModal } from "@/components/checkout/X402PaymentModal";
import { BuyerInformationCard } from "@/components/checkout/buyer-information-card";
import { OrderSummaryCard } from "@/components/checkout/order-summary-card";
import { AnonymousCheckoutModal } from "@/components/checkout/anonymous-checkout-modal";
import { useDirectCheckout } from "@/hooks/use-direct-checkout";
import { useCheckoutHandlers } from "@/hooks/use-checkout-handlers";

const checkoutSchema = z.object({
  email: z.string().email("Invalid email").or(z.literal("")),
  fullName: z.string().min(2, "Full name is required").or(z.literal("")),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutClientProps {
  serverGeneratedOrderId: string;
}

export default function CheckoutClient({
  serverGeneratedOrderId,
}: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const currency = useCurrencyStore((state) => state.currency);
  const {
    items: cartItems,
    promoCode,
    appliedCoupon,
    getDiscountAmount,
    applyCoupon,
    removePromo,
    isCouponValidForCurrency,
  } = useCartStore();
  const { priceSchedules, getEffectivePriceForPackage } = usePriceSchedules();

  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paddle");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const [pendingFormData, setPendingFormData] =
    useState<CheckoutFormData | null>(null);

  // Update URL when anonymous mode changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (isAnonymous) {
      url.searchParams.set("order_id", serverGeneratedOrderId);
    } else {
      url.searchParams.delete("order_id");
    }
    window.history.replaceState({}, "", url.toString());
  }, [isAnonymous, serverGeneratedOrderId]);

  // Determine if this is a direct checkout (via query params)
  const directItemIds = searchParams.get("items") || searchParams.get("item");
  const isDirectCheckout = !!directItemIds;

  // Direct checkout hook
  const { directCheckoutItems, isLoadingDirectItems } = useDirectCheckout(
    mounted,
    directItemIds,
  );

  // Use direct checkout items if available, otherwise use cart items
  const items =
    isDirectCheckout && directCheckoutItems.length > 0
      ? directCheckoutItems
      : cartItems;

  // Checkout handlers
  const {
    isLoading,
    x402ModalOpen,
    setX402ModalOpen,
    x402OrderId,
    paymentRequirements,
    onSubmit,
    handleX402Success,
  } = useCheckoutHandlers(
    items,
    promoCode,
    isDirectCheckout,
    isAnonymous,
    serverGeneratedOrderId,
  );

  // Calculate totals with effective prices
  const cartTotals = useMemo(() => {
    return calculateCartTotals(items, priceSchedules, currency);
  }, [items, priceSchedules, currency]);

  // Get effective prices for each item
  const itemPrices = useMemo(() => {
    const prices = new Map<
      string,
      ReturnType<typeof getEffectivePriceForPackage>
    >();
    for (const item of items) {
      prices.set(item.package.id, getEffectivePriceForPackage(item.package));
    }
    return prices;
  }, [items, getEffectivePriceForPackage]);

  // Wait for client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      fullName: "",
    },
  });

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (user?.email) {
      setValue("email", user.email);
    }
    if (profile?.full_name) {
      setValue("fullName", profile.full_name);
    }
  }, [user, profile, setValue]);

  // Redirect if cart is empty
  useEffect(() => {
    console.log("[Checkout] Redirect effect:", {
      mounted,
      isDirectCheckout,
      isLoadingDirectItems,
      itemsLength: items.length,
      directCheckoutItemsLength: directCheckoutItems.length,
      cartItemsLength: cartItems.length,
    });

    if (!mounted) return;

    if (isDirectCheckout) {
      if (!isLoadingDirectItems && items.length === 0) {
        console.log("[Checkout] Redirecting - no items found after loading");
        toast.error("Paket tidak ditemukan.");
        router.push("/store");
      }
    } else {
      if (items.length === 0) {
        console.log("[Checkout] Redirecting - cart is empty");
        router.push("/cart");
      }
    }
  }, [
    mounted,
    items,
    router,
    isDirectCheckout,
    isLoadingDirectItems,
    directCheckoutItems.length,
    cartItems.length,
  ]);

  // Redirect if currency is IDR
  useEffect(() => {
    if (mounted && currency === "IDR") {
      toast.info(
        "Pembayaran dengan IDR akan segera tersedia. Silakan gunakan USD.",
      );
      router.push("/cart");
    }
  }, [mounted, currency, router]);

  // Show loading while waiting for hydration or loading direct checkout items
  if (!mounted || (isDirectCheckout && isLoadingDirectItems)) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Will redirect in useEffect if no items
  if (items.length === 0 || currency === "IDR") {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate totals
  const { subtotal } = cartTotals;
  const couponDiscount = getDiscountAmount(currency);
  const isCouponValid = isCouponValidForCurrency(currency);
  const validCouponDiscount = isCouponValid ? couponDiscount : 0;
  const total = Math.max(0, subtotal - validCouponDiscount);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isDirectCheckout ? "Kembali" : "Kembali ke Keranjang"}
        </Button>
      </div>

      <BorderedContainer className="bg-transparent">
        <div className="grid gap-3 lg:grid-cols-5">
          {/* Main Form */}
          <div className="lg:col-span-3 space-y-3">
            <form
              id="checkout-form"
              onSubmit={handleSubmit((data) => {
                if (isAnonymous) {
                  setPendingFormData(data);
                  setShowAnonymousModal(true);
                } else {
                  onSubmit(data, paymentMethod);
                }
              })}
            >
              <BuyerInformationCard
                register={register}
                errors={errors}
                userEmail={user?.email}
                currency={currency}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                promoCode={promoCode}
                appliedCoupon={appliedCoupon}
                isCouponValid={isCouponValid}
                validCouponDiscount={validCouponDiscount}
                subtotal={subtotal}
                onApplyCoupon={applyCoupon}
                onRemovePromo={removePromo}
                isAnonymous={isAnonymous}
                onAnonymousChange={setIsAnonymous}
                anonymousOrderId={serverGeneratedOrderId}
              />
            </form>
          </div>

          {/* Order Summary */}
          <OrderSummaryCard
            className="col-span-1 lg:col-span-2"
            items={items}
            currency={currency}
            subtotal={subtotal}
            validCouponDiscount={validCouponDiscount}
            total={total}
            isLoading={isLoading}
            isCouponValid={isCouponValid}
            promoCode={promoCode}
            paymentMethod={paymentMethod}
            itemPrices={itemPrices}
          />
        </div>
      </BorderedContainer>

      {/* x402 Payment Modal */}
      <X402PaymentModal
        open={x402ModalOpen}
        onOpenChange={setX402ModalOpen}
        orderId={x402OrderId || ""}
        paymentRequirements={paymentRequirements}
        onSuccess={handleX402Success}
        onError={(error) => toast.error(error)}
      />

      {/* Anonymous Checkout Modal */}
      <AnonymousCheckoutModal
        open={showAnonymousModal}
        onOpenChange={setShowAnonymousModal}
        orderId={serverGeneratedOrderId}
        onContinue={() => {
          setShowAnonymousModal(false);
          if (pendingFormData) {
            onSubmit(pendingFormData, paymentMethod);
          }
        }}
      />
    </div>
  );
}
