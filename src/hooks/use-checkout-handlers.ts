import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/providers/auth-provider";
import type {
  PaymentRequirements,
  X402CheckoutBackendResponse,
} from "@/types/x402";
import { transformPaymentRequirements } from "@/types/x402";
import type { PaymentMethod } from "@/components/checkout/PaymentMethodSelector";

interface CheckoutFormData {
  email: string;
  fullName: string;
}

export function useCheckoutHandlers(
  items: any[],
  promoCode: string | null,
  isDirectCheckout: boolean,
  isAnonymous: boolean = false,
  anonymousOrderId?: string,
) {
  const router = useRouter();
  const { user, session } = useAuth();
  const { clearCart } = useCartStore();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [x402ModalOpen, setX402ModalOpen] = useState(false);
  const [x402OrderId, setX402OrderId] = useState<string | null>(null);
  const [paymentRequirements, setPaymentRequirements] =
    useState<PaymentRequirements | null>(null);

  const handleX402Checkout = async (formData: CheckoutFormData) => {
    setIsLoading(true);
    console.log("[Checkout] Starting x402 checkout process...");

    const freshItems = useCartStore.getState().items;

    try {
      const cartItems = freshItems.map((item) => ({
        package_code: item.package.package_code,
        quantity: item.quantity,
        period_num: item.periodNum ?? null,
      }));

      let accessToken = session?.access_token;
      if (user && !accessToken) {
        const { data: refreshedSession, error: refreshError } =
          await supabase.auth.refreshSession();
        if (!refreshError) {
          accessToken = refreshedSession?.session?.access_token;
        }
      }

      const isGuest = !accessToken;
      const endpoint = isGuest ? "checkout-x402-guest" : "checkout-x402";
      console.log(
        "[Checkout] x402 mode:",
        isGuest ? "guest" : "authenticated",
        "endpoint:",
        endpoint,
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify({
            items: cartItems,
            customer_email: isAnonymous ? undefined : formData.email,
            customer_name: isAnonymous ? undefined : formData.fullName,
            currency_code: "USD",
            promo_code: promoCode || undefined,
            is_anonymous: isAnonymous,
            anonymous_order_id: isAnonymous ? anonymousOrderId : undefined,
          }),
        },
      );

      const data = await response.json();
      console.log("[Checkout] x402 checkout response:", data);

      if (!response.ok) {
        console.error("[Checkout] x402 error:", data.error);
        throw new Error(data.error || "Failed to create x402 checkout");
      }

      setX402OrderId(data.order_id);
      const transformedRequirements = transformPaymentRequirements(
        data as X402CheckoutBackendResponse,
      );
      setPaymentRequirements(transformedRequirements);
      setX402ModalOpen(true);
    } catch (error) {
      console.error("[Checkout] x402 error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMessage || "Terjadi kesalahan saat membuat checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleX402Success = (transactionHash: string) => {
    console.log("[Checkout] x402 payment success:", transactionHash);
    toast.success("Pembayaran berhasil!");
    if (!isDirectCheckout) {
      clearCart();
    }
    if (x402OrderId) {
      router.push(`/order/success?order=${x402OrderId}&tx=${transactionHash}`);
    }
  };

  const handlePaddleCheckout = async (data: CheckoutFormData) => {
    setIsLoading(true);
    console.log("[Checkout] Starting checkout process...");

    const freshItems = useCartStore.getState().items;

    console.log(
      "[Checkout] Items from store at submit time:",
      JSON.stringify(
        freshItems.map((i) => ({
          id: i.id,
          package_code: i.package.package_code,
          periodNum: i.periodNum,
          periodNumType: typeof i.periodNum,
          quantity: i.quantity,
        })),
        null,
        2,
      ),
    );

    try {
      const cartItems = freshItems.map((item) => {
        console.log("[Checkout] Cart item raw:", {
          package_code: item.package.package_code,
          periodNum: item.periodNum,
          periodNumType: typeof item.periodNum,
          quantity: item.quantity,
        });
        return {
          package_code: item.package.package_code,
          quantity: item.quantity,
          period_num: item.periodNum ?? null,
        };
      });

      console.log(
        "[Checkout] Final cartItems to send:",
        JSON.stringify(cartItems, null, 2),
      );
      console.log("[Checkout] Calling create-checkout edge function...");

      let accessToken = session?.access_token;
      if (user && !accessToken) {
        console.log("[Checkout] Session expired, attempting refresh...");
        const { data: refreshedSession, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("[Checkout] Session refresh failed:", refreshError);
          accessToken = undefined;
        } else {
          accessToken = refreshedSession?.session?.access_token;
        }
      }

      const authToken =
        accessToken || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      console.log(
        "[Checkout] Auth mode:",
        accessToken ? "authenticated" : "guest",
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            items: cartItems,
            customer_email: isAnonymous ? undefined : data.email,
            customer_name: isAnonymous ? undefined : data.fullName,
            discount_code: promoCode || undefined,
            currency: "USD",
            user_id: isAnonymous ? undefined : user?.id,
            is_anonymous: isAnonymous,
            anonymous_order_id: isAnonymous ? anonymousOrderId : undefined,
          }),
        },
      );

      const result = await response.json();
      console.log("[Checkout] Edge function response:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create checkout");
      }

      if (!isDirectCheckout) {
        clearCart();
      }

      if (result.checkout_url) {
        console.log("[Checkout] Redirecting to Paddle:", result.checkout_url);
        toast.success("Mengarahkan ke halaman pembayaran...");
        window.location.href = result.checkout_url;
      } else {
        console.warn(
          "[Checkout] No checkout_url returned, redirecting to order page",
        );
        toast.success("Pesanan berhasil dibuat!");
        router.push(`/order/success?order=${result.order_number}`);
      }
    } catch (error) {
      console.error("[Checkout] Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("timeout")) {
        toast.error("Koneksi timeout. Silakan coba lagi.");
      } else if (errorMessage.includes("Cart is empty")) {
        toast.error("Keranjang kosong. Silakan tambahkan produk.");
        router.push("/packages");
      } else if (errorMessage.includes("No valid packages")) {
        toast.error("Paket tidak tersedia. Silakan pilih paket lain.");
      } else {
        toast.error(errorMessage || "Terjadi kesalahan saat membuat pesanan");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (
    data: CheckoutFormData,
    paymentMethod: PaymentMethod,
  ) => {
    if (paymentMethod === "x402") {
      await handleX402Checkout(data);
    } else {
      await handlePaddleCheckout(data);
    }
  };

  return {
    isLoading,
    x402ModalOpen,
    setX402ModalOpen,
    x402OrderId,
    paymentRequirements,
    onSubmit,
    handleX402Success,
  };
}
