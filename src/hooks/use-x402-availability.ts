import { useCurrencyStore } from "@/stores/currency-store"

export function useX402Availability() {
  const currency = useCurrencyStore((state) => state.currency)

  const isX402Enabled = process.env.NEXT_PUBLIC_X402_ENABLED === "true"
  const isX402Available = isX402Enabled && currency === "USD"

  const unavailabilityReason = !isX402Enabled
    ? "USDC payments are currently disabled"
    : currency !== "USD"
      ? "USDC payments are only available for USD currency"
      : null

  return {
    isX402Available,
    isX402Enabled,
    unavailabilityReason,
  }
}
