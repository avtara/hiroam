import CheckoutClient from "./checkout-client";

function generateOrderId(): string {
  const prefix = Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const timestamp = `${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now.getSeconds().toString().padStart(2, "0")}`;
  return `${prefix}-HR-${timestamp}`;
}

export default function CheckoutPage() {
  const serverGeneratedOrderId = generateOrderId();

  return <CheckoutClient serverGeneratedOrderId={serverGeneratedOrderId} />;
}
