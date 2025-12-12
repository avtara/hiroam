"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignTypedData,
  useChainId,
  useSwitchChain,
} from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { keccak256, toHex } from "viem"
import type { NetworkPaymentRequirements, PaymentStatus } from "@/types/x402"

interface EVMWalletConnectProps {
  network: "base" | "base-sepolia"
  paymentRequirements: NetworkPaymentRequirements
  onStatusChange: (status: PaymentStatus) => void
  onSuccess: (paymentPayload: string) => void
  onError: (error: string) => void
}

// EIP-3009 Authorization Types for USDC
const authorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const

export function EVMWalletConnect({
  network,
  paymentRequirements,
  onStatusChange,
  onSuccess,
  onError,
}: EVMWalletConnectProps) {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { signTypedDataAsync } = useSignTypedData()

  const [isSigning, setIsSigning] = useState(false)

  const targetChainId = network === "base" ? base.id : baseSepolia.id
  const targetChain = network === "base" ? base : baseSepolia
  const isCorrectChain = chainId === targetChainId

  // USDC contract addresses
  const usdcAddress =
    network === "base"
      ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      : "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

  const handleConnect = async () => {
    onStatusChange("connecting")
    try {
      // Try to connect with injected wallet (MetaMask, etc.)
      const injectedConnector = connectors.find((c) => c.id === "injected")
      if (injectedConnector) {
        connect({ connector: injectedConnector })
      } else if (connectors[0]) {
        connect({ connector: connectors[0] })
      }
    } catch {
      onStatusChange("idle")
      onError("Failed to connect wallet")
    }
  }

  const handleSwitchChain = async () => {
    try {
      switchChain({ chainId: targetChainId })
    } catch {
      onError("Failed to switch network")
    }
  }

  const handlePayment = async () => {
    if (!address || !paymentRequirements) return

    setIsSigning(true)
    onStatusChange("signing")

    try {
      // Generate random nonce
      const nonce = keccak256(toHex(Date.now() + Math.random()))

      // Calculate time window (5 minutes)
      const now = Math.floor(Date.now() / 1000)
      const validAfter = now - 60 // 1 minute ago (for clock skew)
      const validBefore = now + 300 // 5 minutes from now

      // Parse amount
      const amount = BigInt(paymentRequirements.maxAmountRequired)

      // Create authorization message
      const message = {
        from: address,
        to: paymentRequirements.payTo as `0x${string}`,
        value: amount,
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce: nonce as `0x${string}`,
      }

      // USDC EIP-712 domain
      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: targetChainId,
        verifyingContract: usdcAddress as `0x${string}`,
      }

      // Sign the typed data
      const signature = await signTypedDataAsync({
        domain,
        types: authorizationTypes,
        primaryType: "TransferWithAuthorization",
        message,
      })

      // Create payment payload
      const paymentPayload = JSON.stringify({
        x402Version: 1,
        scheme: "exact",
        network,
        payload: {
          signature,
          authorization: {
            from: address,
            to: paymentRequirements.payTo,
            value: amount.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
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

  // Auto-switch chain when connected but on wrong chain
  useEffect(() => {
    if (isConnected && !isCorrectChain) {
      // Small delay to ensure stable state
      const timer = setTimeout(handleSwitchChain, 500)
      return () => clearTimeout(timer)
    }
  }, [isConnected, isCorrectChain])

  if (!isConnected) {
    return (
      <Button className="w-full" onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>
    )
  }

  if (!isCorrectChain) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">
          Please switch to {targetChain.name}
        </p>
        <Button className="w-full" onClick={handleSwitchChain}>
          Switch to {targetChain.name}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Connected:</span>
        <span className="font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
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
