"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Package, ArrowRight, AlertCircle } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"
import { X402PaymentModal } from "@/components/checkout/X402PaymentModal"
import { useCurrencyStore } from "@/stores/currency-store"
import type { PaymentRequirements } from "@/types/x402"

interface TopupPackage {
  package_code: string
  name: string
  data_amount: number
  validity_days: number
  price_usd: number
}

interface TopupX402DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  esimProfileId: string
  // For guest users
  orderNumber?: string
  customerEmail?: string
  onSuccess?: () => void
}

export function TopupX402Dialog({
  open,
  onOpenChange,
  esimProfileId,
  orderNumber,
  customerEmail,
  onSuccess,
}: TopupX402DialogProps) {
  const { session } = useAuth()
  const currency = useCurrencyStore((state) => state.currency)

  const [packages, setPackages] = useState<TopupPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<TopupPackage | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // x402 payment state
  const [x402ModalOpen, setX402ModalOpen] = useState(false)
  const [x402OrderId, setX402OrderId] = useState<string | null>(null)
  const [paymentRequirements, setPaymentRequirements] =
    useState<PaymentRequirements | null>(null)

  const isGuest = !session && !!orderNumber && !!customerEmail
  const showX402 = currency === "USD"

  // Fetch topup packages
  useEffect(() => {
    if (!open || !esimProfileId) return

    const fetchPackages = async () => {
      setIsLoading(true)
      setError(null)

      try {
        let response: Response

        if (isGuest) {
          // Guest: use order_number + email
          response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/topup-packages-guest`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_number: orderNumber,
                email: customerEmail,
              }),
            }
          )
        } else {
          // Auth: use JWT
          response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-topup-packages`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ esim_profile_id: esimProfileId }),
            }
          )
        }

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch packages")
        }

        setPackages(data.packages || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPackages()
  }, [open, esimProfileId, isGuest, orderNumber, customerEmail, session])

  // Handle x402 topup checkout
  const handleX402Topup = async () => {
    if (!selectedPackage) return

    setIsLoading(true)
    setError(null)

    try {
      let response: Response

      if (isGuest) {
        // Guest topup
        response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/topup-x402-guest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_number: orderNumber,
              email: customerEmail,
              esim_profile_id: esimProfileId,
              package_code: selectedPackage.package_code,
            }),
          }
        )
      } else {
        // Auth topup
        response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/topup-x402`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              esim_profile_id: esimProfileId,
              package_code: selectedPackage.package_code,
            }),
          }
        )
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create topup checkout")
      }

      // Open x402 payment modal
      setX402OrderId(data.order_id)
      setPaymentRequirements(data.payment_requirements)
      setX402ModalOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    setX402ModalOpen(false)
    onOpenChange(false)
    onSuccess?.()
  }

  const handlePaymentError = (errorMsg: string) => {
    setX402ModalOpen(false)
    setError(errorMsg)
  }

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPackage(null)
      setError(null)
      setPackages([])
    }
  }, [open])

  // Don't show x402 option if not USD
  if (!showX402) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Top Up eSIM with USDC</DialogTitle>
            <DialogDescription>
              Add more data to your eSIM using cryptocurrency
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoading && !packages.length ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading packages...
                </span>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setError(null)
                    onOpenChange(false)
                  }}
                >
                  Close
                </Button>
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No topup packages available for this eSIM
                </p>
              </div>
            ) : (
              <>
                {/* Package Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Select Topup Package
                  </label>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.package_code}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPackage?.package_code === pkg.package_code
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                        onClick={() => setSelectedPackage(pkg)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{pkg.name}</span>
                          </div>
                          <span className="font-bold text-primary">
                            ${pkg.price_usd.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          {pkg.data_amount >= 1000
                            ? `${(pkg.data_amount / 1000).toFixed(0)}GB`
                            : `${pkg.data_amount}MB`}{" "}
                          • {pkg.validity_days} days validity
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Package Summary */}
                {selectedPackage && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Selected:
                      </span>
                      <span className="font-medium">{selectedPackage.name}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">
                        Total:
                      </span>
                      <span className="text-lg font-bold">
                        ${selectedPackage.price_usd.toFixed(2)} USDC
                      </span>
                    </div>
                  </div>
                )}

                {/* Checkout Button */}
                <Button
                  className="w-full"
                  onClick={handleX402Topup}
                  disabled={!selectedPackage || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Checkout...
                    </>
                  ) : (
                    <>
                      Pay with USDC
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Info text */}
                <p className="text-xs text-center text-muted-foreground">
                  Pay securely with USDC on Base or Solana network
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* x402 Payment Modal */}
      <X402PaymentModal
        open={x402ModalOpen}
        onOpenChange={setX402ModalOpen}
        orderId={x402OrderId || ""}
        paymentRequirements={paymentRequirements}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </>
  )
}
