"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import {
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
} from "@solana/web3.js"
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import type { NetworkPaymentRequirements, PaymentStatus } from "@/types/x402"
import { USDC_MINT } from "@/lib/solana-config"

interface SolanaWalletConnectProps {
  network: "solana" | "solana-devnet"
  paymentRequirements: NetworkPaymentRequirements
  onStatusChange: (status: PaymentStatus) => void
  onSuccess: (paymentPayload: string) => void
  onError: (error: string) => void
  onWalletModalChange?: (isOpen: boolean) => void
}

export function SolanaWalletConnect({
  network,
  paymentRequirements,
  onStatusChange,
  onSuccess,
  onError,
  onWalletModalChange,
}: SolanaWalletConnectProps) {
  const { connected, publicKey, signTransaction, disconnect } = useWallet()
  const { connection } = useConnection()
  const { visible: walletModalVisible } = useWalletModal()

  const [isSigning, setIsSigning] = useState(false)

  const usdcMint = new PublicKey(USDC_MINT[network])

  // Notify parent when wallet modal visibility changes
  useEffect(() => {
    onWalletModalChange?.(walletModalVisible)
  }, [walletModalVisible, onWalletModalChange])

  const handlePayment = async () => {
    if (!publicKey || !signTransaction || !paymentRequirements) return

    setIsSigning(true)
    onStatusChange("signing")

    try {
      // Parse addresses
      const payToAddress = new PublicKey(paymentRequirements.payTo)

      console.log("[Solana] Starting payment process...")
      console.log("[Solana] Payment requirements:", {
        payTo: paymentRequirements.payTo,
        maxAmountRequired: paymentRequirements.maxAmountRequired,
        network,
      })

      // Get token accounts
      const sourceATA = await getAssociatedTokenAddress(usdcMint, publicKey)
      const destATA = await getAssociatedTokenAddress(usdcMint, payToAddress)

      // Parse amount (USDC has 6 decimals) - ensure it's an integer before BigInt conversion
      const amountString = paymentRequirements.maxAmountRequired
      const amountNumber = Math.floor(Number(amountString))
      const amount = BigInt(amountNumber)

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash()

      // Create transaction - user is fee payer for signing
      // Facilitator may sponsor fees later if configured
      const transaction = new Transaction()
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight
      transaction.feePayer = publicKey // User pays fees (wallet must be fee payer to sign)

      // Add compute budget instructions
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 })
      )
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
      )

      // Add transfer instruction
      transaction.add(
        createTransferCheckedInstruction(
          sourceATA, // source
          usdcMint, // mint
          destATA, // destination
          publicKey, // owner
          amount, // amount
          6, // decimals (USDC has 6)
          [], // multiSigners
          TOKEN_PROGRAM_ID // programId
        )
      )

      console.log("[Solana] Transaction built:", {
        feePayer: transaction.feePayer?.toBase58(),
        blockhash: transaction.recentBlockhash,
        instructionCount: transaction.instructions.length,
        sourceATA: sourceATA.toBase58(),
        destATA: destATA.toBase58(),
        amount: amount.toString(),
      })

      // Sign transaction
      console.log("[Solana] Requesting wallet signature...")
      const signedTx = await signTransaction(transaction)
      console.log("[Solana] Transaction signed successfully")

      // Serialize to base64
      const serializedTx = signedTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      const base64Tx = Buffer.from(serializedTx).toString("base64")

      // Create payment payload
      const paymentPayload = JSON.stringify({
        x402Version: 1,
        scheme: "exact",
        network,
        payload: {
          transaction: base64Tx,
        },
      })

      onSuccess(paymentPayload)
    } catch (error) {
      console.error("Payment error:", error)
      onError(error instanceof Error ? error.message : "Payment failed")
    } finally {
      setIsSigning(false)
    }
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center gap-3">
        <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90" />
        <p className="text-xs text-muted-foreground">
          Connect Phantom, Solflare, or other Solana wallets
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Connected:</span>
        <span className="font-mono">
          {publicKey?.toBase58().slice(0, 6)}...
          {publicKey?.toBase58().slice(-4)}
        </span>
      </div>
      <Button className="w-full" onClick={handlePayment} disabled={isSigning}>
        {isSigning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sign Transaction...
          </>
        ) : (
          "Pay with USDC"
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => disconnect()}
      >
        Disconnect
      </Button>
    </div>
  )
}
