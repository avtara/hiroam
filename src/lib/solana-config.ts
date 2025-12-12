import { clusterApiUrl, Connection } from "@solana/web3.js"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets"

export type SolanaNetwork = "solana" | "solana-devnet"

export const getSolanaConnection = (network: SolanaNetwork) => {
  const endpoint =
    network === "solana"
      ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta")
      : clusterApiUrl("devnet")

  return new Connection(endpoint, "confirmed")
}

export const getSolanaWallets = () => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TorusWalletAdapter(),
]

// USDC mint addresses
export const USDC_MINT = {
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "solana-devnet": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
} as const
