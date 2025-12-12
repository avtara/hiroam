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

// Raw backend response format (what the edge function returns)
export interface X402CheckoutBackendResponse {
  success: boolean
  order_id: string
  order_number: string
  total_usd: number
  total_atomic: string
  network: string
  payment_requirements: {
    x402Version?: number
    accepts?: NetworkPaymentRequirements[]
    // Backend might also return in networks format directly
    networks?: { [key: string]: NetworkPaymentRequirements }
    // Or frontend format fields directly
    order_id?: string
    order_number?: string
    amount_usd?: number
    amount_usdc_atomic?: string
    expires_at?: string
  }
}

/**
 * Create empty PaymentRequirements for error cases
 */
function createEmptyPaymentRequirements(
  order_id?: string,
  order_number?: string,
  amount_usd?: number,
  amount_usdc_atomic?: string
): PaymentRequirements {
  return {
    order_id: order_id || '',
    order_number: order_number || '',
    amount_usd: amount_usd || 0,
    amount_usdc_atomic: amount_usdc_atomic || '0',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    networks: {},
  }
}

/**
 * Transform backend checkout response to frontend PaymentRequirements format
 * Handles multiple response formats for compatibility
 */
export function transformPaymentRequirements(
  backendResponse: X402CheckoutBackendResponse
): PaymentRequirements {
  // Handle null/undefined response
  if (!backendResponse) {
    console.error('[x402] No backend response provided')
    return createEmptyPaymentRequirements()
  }

  const { order_id, order_number, total_usd, total_atomic, payment_requirements } = backendResponse

  // Handle case where payment_requirements is null/undefined
  if (!payment_requirements) {
    console.error('[x402] payment_requirements is null/undefined')
    return createEmptyPaymentRequirements(order_id, order_number, total_usd, total_atomic)
  }

  // If payment_requirements is already in frontend format (has networks object)
  if (payment_requirements.networks && typeof payment_requirements.networks === 'object') {
    return {
      order_id: payment_requirements.order_id || order_id,
      order_number: payment_requirements.order_number || order_number,
      amount_usd: payment_requirements.amount_usd || total_usd,
      amount_usdc_atomic: payment_requirements.amount_usdc_atomic || total_atomic,
      expires_at: payment_requirements.expires_at || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      networks: payment_requirements.networks,
    }
  }

  // If payment_requirements has accepts array (backend format)
  if (payment_requirements.accepts && Array.isArray(payment_requirements.accepts)) {
    const networks: { [key: string]: NetworkPaymentRequirements } = {}
    for (const req of payment_requirements.accepts) {
      networks[req.network] = req
    }

    return {
      order_id,
      order_number,
      amount_usd: total_usd,
      amount_usdc_atomic: total_atomic,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      networks,
    }
  }

  // Fallback: return payment_requirements as-is if it matches PaymentRequirements interface
  // This handles the case where backend already returns frontend-compatible format
  const pr = payment_requirements as unknown as PaymentRequirements
  if (pr.networks) {
    return pr
  }

  // Last resort: create empty networks object to prevent runtime errors
  console.error('[x402] Unknown payment_requirements format:', payment_requirements)
  return createEmptyPaymentRequirements(order_id, order_number, total_usd, total_atomic)
}
