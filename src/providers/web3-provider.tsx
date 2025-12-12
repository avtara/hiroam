"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { wagmiConfig } from "@/lib/wagmi-config"
import {
  getSolanaConnection,
  getSolanaWallets,
  type SolanaNetwork,
} from "@/lib/solana-config"
import { useMemo, useState } from "react"

// Required styles for Solana wallet adapter
import "@solana/wallet-adapter-react-ui/styles.css"

interface Web3ProviderProps {
  children: React.ReactNode
  solanaNetwork?: SolanaNetwork
}

export function Web3Provider({
  children,
  solanaNetwork = "solana-devnet",
}: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient())

  const connection = useMemo(
    () => getSolanaConnection(solanaNetwork),
    [solanaNetwork]
  )

  const wallets = useMemo(() => getSolanaWallets(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ConnectionProvider endpoint={connection.rpcEndpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>{children}</WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
