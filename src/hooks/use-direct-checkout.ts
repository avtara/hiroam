import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { CartItem } from "@/stores/cart-store";

export function useDirectCheckout(
  mounted: boolean,
  directItemIds: string | null
) {
  const router = useRouter();
  const [directCheckoutItems, setDirectCheckoutItems] = useState<CartItem[]>(
    []
  );
  const [isLoadingDirectItems, setIsLoadingDirectItems] = useState(
    !!directItemIds
  );
  const supabase = createClient();

  useEffect(() => {
    console.log("[Checkout] Direct checkout effect triggered:", {
      mounted,
      directItemIds,
    });

    if (!mounted || !directItemIds) {
      console.log("[Checkout] Skipping fetch - not ready");
      return;
    }

    const fetchDirectCheckoutItems = async () => {
      console.log("[Checkout] Starting fetch for direct checkout items");
      setIsLoadingDirectItems(true);
      try {
        // Parse item IDs from query params (comma-separated)
        const itemIds = directItemIds.split(",").filter(Boolean);
        console.log("[Checkout] Parsed item IDs:", itemIds);

        if (itemIds.length === 0) {
          router.push("/cart");
          return;
        }

        // Count occurrences of each ID for quantity
        const idCounts = itemIds.reduce(
          (acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const uniqueIds = Object.keys(idCounts);
        console.log("[Checkout] Unique IDs:", uniqueIds);
        console.log("[Checkout] ID counts:", idCounts);

        // Fetch packages from Supabase
        console.log("[Checkout] Querying Supabase for packages...");
        const { data: packages, error } = await supabase
          .from("esim_packages")
          .select("*")
          .in("id", uniqueIds);

        console.log("[Checkout] Supabase response:", { packages, error });

        if (error) {
          console.error("[Checkout] Error fetching packages:", error);
          toast.error("Gagal memuat paket. Silakan coba lagi.");
          router.push("/store");
          return;
        }

        if (!packages || packages.length === 0) {
          console.warn("[Checkout] No packages found in database");
          toast.error("Paket tidak ditemukan.");
          router.push("/store");
          return;
        }

        console.log("[Checkout] Found packages:", packages);

        // Convert to cart item format
        const checkoutItems = packages.map((pkg) => ({
          id: `direct-${pkg.id}`,
          package: pkg,
          quantity: idCounts[pkg.id] || 1,
          addedAt: new Date().toISOString(),
        }));

        console.log("[Checkout] Created checkout items:", checkoutItems);
        setDirectCheckoutItems(checkoutItems);
        console.log("[Checkout] Direct checkout items set successfully");
      } catch (err) {
        console.error("[Checkout] Error in direct checkout:", err);
        toast.error("Terjadi kesalahan. Silakan coba lagi.");
        router.push("/store");
      } finally {
        setIsLoadingDirectItems(false);
      }
    };

    fetchDirectCheckoutItems();
  }, [mounted, directItemIds, router, supabase]);

  return {
    directCheckoutItems,
    isLoadingDirectItems,
  };
}
