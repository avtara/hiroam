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
import {
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react"
import { NetworkSelector, getDefaultNetwork } from "./NetworkSelector"
import { EVMWalletConnect } from "./EVMWalletConnect"
import { SolanaWalletConnect } from "./SolanaWalletConnect"
import { useX402Network } from "@/hooks/use-x402-network"
import type { PaymentRequirements, PaymentStatus, NetworkType } from "@/types/x402"

interface X402PaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  paymentRequirements: PaymentRequirements | null
  onSuccess: (transactionHash: string) => void
  onError: (error: string) => void
}

export function X402PaymentModal({
  open,
  onOpenChange,
  orderId,
  paymentRequirements,
  onSuccess,
  onError,
}: X402PaymentModalProps) {
  // Use environment-configured default network
  const [network, setNetwork] = useState<NetworkType>(getDefaultNetwork())
  const [status, setStatus] = useState<PaymentStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const { getExplorerTxUrl } = useX402Network()

  const isEVM = network === "base" || network === "base-sepolia"
  const isSolana = network === "solana" || network === "solana-devnet"

  // Get network-specific payment requirements
  const networkRequirements = paymentRequirements?.networks?.[network]

  const handlePaymentSuccess = async (paymentPayload: string) => {
    setStatus("verifying")

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/x402-verify-settle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: orderId,
            network,
            payment: paymentPayload,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Payment verification failed")
      }

      setStatus("success")
      setTransactionHash(data.transaction_hash)
      onSuccess(data.transaction_hash)
    } catch (error) {
      setStatus("error")
      const message = error instanceof Error ? error.message : "Payment failed"
      setErrorMessage(message)
      onError(message)
    }
  }

  const handlePaymentError = (error: string) => {
    setStatus("error")
    setErrorMessage(error)
    onError(error)
  }

  const resetPayment = () => {
    setStatus("idle")
    setErrorMessage(null)
    setTransactionHash(null)
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Small delay to allow animation to complete
      const timer = setTimeout(resetPayment, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Get status message based on current state
  const getStatusMessage = () => {
    switch (status) {
      case "connecting":
        return "Connecting wallet..."
      case "signing":
        return "Please sign the transaction in your wallet..."
      case "verifying":
        return "Verifying payment with facilitator..."
      case "settling":
        return "Settling transaction on-chain..."
      case "success":
        return "Payment successful!"
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pay with USDC</DialogTitle>
          <DialogDescription>
            Complete your purchase using USDC stablecoin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Display */}
          {paymentRequirements && (
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-3xl font-bold">
                ${paymentRequirements.amount_usd.toFixed(2)} USDC
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Order #{paymentRequirements.order_number}
              </p>
            </div>
          )}

          {/* Network Selector */}
          {status === "idle" && (
            <NetworkSelector
              selected={network}
              onSelect={setNetwork}
              disabled={status !== "idle"}
            />
          )}

          {/* Status Display */}
          {status !== "idle" && status !== "error" && status !== "success" && (
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{getStatusMessage()}</span>
            </div>
          )}

          {/* Success Display */}
          {status === "success" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Payment Successful!</p>
                  <p className="text-sm opacity-80">
                    Your order has been confirmed
                  </p>
                </div>
              </div>

              {transactionHash && (
                <a
                  href={getExplorerTxUrl(network, transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="font-mono">
                    {transactionHash.slice(0, 8)}...{transactionHash.slice(-8)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Continue to Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error Display */}
          {status === "error" && errorMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
                <XCircle className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Payment Failed</p>
                  <p className="text-xs opacity-80 mt-1">{errorMessage}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={resetPayment}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Wallet Connect Section */}
          {status === "idle" && networkRequirements && (
            <>
              {isEVM && (
                <EVMWalletConnect
                  network={network as "base" | "base-sepolia"}
                  paymentRequirements={networkRequirements}
                  onStatusChange={setStatus}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
              {isSolana && (
                <SolanaWalletConnect
                  network={network as "solana" | "solana-devnet"}
                  paymentRequirements={networkRequirements}
                  onStatusChange={setStatus}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              )}
            </>
          )}

          {/* Network requirements not available */}
          {status === "idle" && !networkRequirements && paymentRequirements && (
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-lg">
              <p className="text-sm">
                This network is not available for this order. Please select a
                different network.
              </p>
            </div>
          )}

          {/* Expiry warning */}
          {paymentRequirements?.expires_at && status === "idle" && (
            <p className="text-xs text-center text-muted-foreground">
              Payment expires at{" "}
              {new Date(paymentRequirements.expires_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
