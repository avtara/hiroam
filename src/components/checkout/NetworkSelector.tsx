"use client"

import { useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { NetworkType } from "@/types/x402"

interface NetworkSelectorProps {
  selected: NetworkType
  onSelect: (network: NetworkType) => void
  disabled?: boolean
}

// All available networks (reference)
const ALL_NETWORKS: Array<{
  id: NetworkType
  name: string
  chain: "evm" | "solana"
  isTestnet: boolean
  icon: string
}> = [
  {
    id: "base-sepolia",
    name: "Base Sepolia",
    chain: "evm",
    isTestnet: true,
    icon: "B",
  },
  {
    id: "base",
    name: "Base",
    chain: "evm",
    isTestnet: false,
    icon: "B",
  },
  {
    id: "solana-devnet",
    name: "Solana Devnet",
    chain: "solana",
    isTestnet: true,
    icon: "S",
  },
  {
    id: "solana",
    name: "Solana",
    chain: "solana",
    isTestnet: false,
    icon: "S",
  },
]

/**
 * Get enabled networks from environment variable
 */
function getEnabledNetworks(): NetworkType[] {
  const enabledEnv = process.env.NEXT_PUBLIC_X402_ENABLED_NETWORKS

  if (enabledEnv) {
    return enabledEnv.split(",").map((n) => n.trim()) as NetworkType[]
  }

  // Default based on environment mode
  const isDevelopment = process.env.NEXT_PUBLIC_X402_ENV === "development"
  return isDevelopment ? ["base-sepolia", "solana-devnet"] : ["base", "solana"]
}

/**
 * Get default network for initial selection
 */
export function getDefaultNetwork(): NetworkType {
  const defaultEnv = process.env.NEXT_PUBLIC_X402_DEFAULT_NETWORK as NetworkType
  if (defaultEnv) return defaultEnv

  const enabledNetworks = getEnabledNetworks()
  return enabledNetworks[0] || "base-sepolia"
}

export function NetworkSelector({
  selected,
  onSelect,
  disabled,
}: NetworkSelectorProps) {
  // Filter networks based on environment configuration
  const enabledNetworks = useMemo(() => {
    const allowed = getEnabledNetworks()
    return ALL_NETWORKS.filter((network) => allowed.includes(network.id))
  }, [])

  // Auto-select first enabled network if current selection is not allowed
  useEffect(() => {
    const allowed = getEnabledNetworks()
    if (!allowed.includes(selected) && enabledNetworks.length > 0) {
      onSelect(enabledNetworks[0].id)
    }
  }, [selected, enabledNetworks, onSelect])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Network</label>
      <div className="grid grid-cols-2 gap-2">
        {enabledNetworks.map((network) => (
          <Card
            key={network.id}
            className={`p-3 cursor-pointer border-2 transition-colors ${
              selected === network.id
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => !disabled && onSelect(network.id)}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold w-7 h-7 rounded-full flex items-center justify-center ${
                  network.chain === "evm"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-purple-100 text-purple-600"
                }`}
              >
                {network.icon}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{network.name}</p>
              </div>
              {network.isTestnet && (
                <Badge variant="secondary" className="text-xs">
                  Testnet
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>
      {enabledNetworks.length === 0 && (
        <p className="text-sm text-destructive">
          No networks configured. Check NEXT_PUBLIC_X402_ENABLED_NETWORKS.
        </p>
      )}
    </div>
  )
}
