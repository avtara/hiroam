// x402 TypeScript Types

export type NetworkType = "base-sepolia" | "base" | "solana-devnet" | "solana"

export interface NetworkPaymentRequirements {
  scheme: "exact"
  network: string
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: string
  maxTimeoutSeconds: number
  asset: string
  extra?: {
    name?: string
    version?: string
    feePayer?: string // For Solana
  }
}

export interface PaymentRequirements {
  order_id: string
  order_number: string
  amount_usd: number
  amount_usdc_atomic: string
  expires_at: string
  networks: {
    [key: string]: NetworkPaymentRequirements
  }
}

export interface X402PaymentPayload {
  x402Version: 1
  scheme: "exact"
  network: string
  payload: EVMPayload | SolanaPayload
}

export interface EVMPayload {
  signature: string
  authorization: {
    from: string
    to: string
    value: string
    validAfter: string
    validBefore: string
    nonce: string
  }
}

export interface SolanaPayload {
  transaction: string // Base64 encoded partially-signed transaction
}

export interface X402CheckoutResponse {
  success: boolean
  order_id: string
  order_number: string
  payment_requirements: PaymentRequirements
  total_cents: number
  discount_cents: number
}

export interface X402VerifySettleResponse {
  success: boolean
  transaction_hash?: string
  network?: string
  payer?: string
  order_number?: string
  error?: string
}

export type PaymentStatus =
  | "idle"
  | "connecting"
  | "signing"
  | "verifying"
  | "settling"
  | "success"
  | "error"
