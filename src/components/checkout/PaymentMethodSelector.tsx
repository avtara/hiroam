"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Coins } from "lucide-react"

type PaymentMethod = "paddle" | "x402"

interface PaymentMethodSelectorProps {
  totalUsd: number
  onSelect: (method: PaymentMethod) => void
  selected: PaymentMethod
  x402Enabled?: boolean
}

export function PaymentMethodSelector({
  totalUsd,
  onSelect,
  selected,
  x402Enabled = true,
}: PaymentMethodSelectorProps) {
  const paddleDisabled = totalUsd < 4

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Paddle Option */}
      <Card
        className={`p-4 cursor-pointer border-2 transition-colors ${
          selected === "paddle"
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/50"
        } ${paddleDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => !paddleDisabled && onSelect("paddle")}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-muted">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Credit/Debit Card</h3>
              {paddleDisabled && (
                <Badge variant="secondary" className="text-xs">
                  Min $4.00
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Pay with Visa, Mastercard, or other cards
            </p>
          </div>
          <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center">
            {selected === "paddle" && (
              <div className="h-3 w-3 rounded-full bg-primary" />
            )}
          </div>
        </div>
      </Card>

      {/* x402 Crypto Option */}
      {x402Enabled && (
        <Card
          className={`p-4 cursor-pointer border-2 transition-colors ${
            selected === "x402"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50"
          }`}
          onClick={() => onSelect("x402")}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-muted">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">USDC (Crypto)</h3>
                <Badge
                  variant="outline"
                  className="text-xs text-green-600 border-green-600"
                >
                  No minimum
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pay with USDC on Base or Solana
              </p>
            </div>
            <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center">
              {selected === "x402" && (
                <div className="h-3 w-3 rounded-full bg-primary" />
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export type { PaymentMethod }
