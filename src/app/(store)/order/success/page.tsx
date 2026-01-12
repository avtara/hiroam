import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrderSuccessClient } from "./order-success-client";

export const metadata: Metadata = {
  title: "Payment Success - HiRoaming",
  description:
    "Your payment was successful. Your eSIM order is being processed.",
};

interface OrderSuccessPageProps {
  searchParams: Promise<{
    order?: string;
    tx?: string;
  }>;
}

export default async function OrderSuccessPage({
  searchParams,
}: OrderSuccessPageProps) {
  const params = await searchParams;
  const orderId = params.order;
  const txHash = params.tx;

  if (!orderId) {
    redirect("/store");
  }

  const supabase = await createClient();

  // Fetch order with items
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderId)
    .single();

  if (orderError || !order) {
    console.error("Error fetching order:", orderError);
    redirect("/store");
  }

  // Fetch order items
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id);

  if (itemsError) {
    console.error("Error fetching order items:", itemsError);
  }

  // Fetch package details for location info
  const packageCodes = orderItems?.map((item) => item.package_code) || [];
  const { data: packages } = await supabase
    .from("esim_packages")
    .select("package_code, location_code, volume, duration, duration_unit")
    .in("package_code", packageCodes);

  // Create a map for quick lookup
  const packageMap = new Map(
    packages?.map((pkg) => [pkg.package_code, pkg]) || [],
  );

  // Enrich order items with package details
  const enrichedItems =
    orderItems?.map((item) => ({
      ...item,
      packageDetails: packageMap.get(item.package_code),
    })) || [];

  return (
    <OrderSuccessClient
      order={order}
      orderItems={enrichedItems}
      txHash={txHash}
    />
  );
}
