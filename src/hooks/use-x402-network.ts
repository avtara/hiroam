import { useMemo } from "react"
import type { NetworkType } from "@/types/x402"

interface NetworkInfo {
  id: NetworkType
  name: string
  chain: "evm" | "solana"
  isTestnet: boolean
  usdcAddress: string
  explorerUrl: string
}

const NETWORK_INFO: Record<NetworkType, NetworkInfo> = {
  "base-sepolia": {
    id: "base-sepolia",
    name: "Base Sepolia",
    chain: "evm",
    isTestnet: true,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerUrl: "https://sepolia.basescan.org",
  },
  base: {
    id: "base",
    name: "Base",
    chain: "evm",
    isTestnet: false,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    explorerUrl: "https://basescan.org",
  },
  "solana-devnet": {
    id: "solana-devnet",
    name: "Solana Devnet",
    chain: "solana",
    isTestnet: true,
    usdcAddress: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
  },
  solana: {
    id: "solana",
    name: "Solana",
    chain: "solana",
    isTestnet: false,
    usdcAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    explorerUrl: "https://explorer.solana.com",
  },
}

/**
 * Get enabled networks from environment variable
 * Development: base-sepolia, solana-devnet (testnets only)
 * Production: base, solana (mainnets only)
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

/**
 * Hook to get x402 network configuration
 * Respects NEXT_PUBLIC_X402_ENABLED_NETWORKS environment variable
 */
export function useX402Network() {
  const enabledNetworks = useMemo(() => getEnabledNetworks(), [])

  const defaultNetwork = useMemo(() => {
    const defaultEnv = process.env
      .NEXT_PUBLIC_X402_DEFAULT_NETWORK as NetworkType
    if (defaultEnv && enabledNetworks.includes(defaultEnv)) {
      return defaultEnv
    }
    return enabledNetworks[0] || "base-sepolia"
  }, [enabledNetworks])

  const isNetworkEnabled = (network: NetworkType) =>
    enabledNetworks.includes(network)

  const getNetworkInfo = (network: NetworkType) => NETWORK_INFO[network]

  const getExplorerTxUrl = (network: NetworkType, txHash: string) => {
    const info = NETWORK_INFO[network]
    if (info.chain === "evm") {
      return `${info.explorerUrl}/tx/${txHash}`
    }
    return `${info.explorerUrl}/tx/${txHash}`
  }

  return {
    enabledNetworks,
    defaultNetwork,
    isNetworkEnabled,
    getNetworkInfo,
    getExplorerTxUrl,
    isDevelopment: process.env.NEXT_PUBLIC_X402_ENV === "development",
    isProduction: process.env.NEXT_PUBLIC_X402_ENV === "production",
  }
}
