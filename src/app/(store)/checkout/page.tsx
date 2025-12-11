"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  ShoppingCart,
  Tag,
  Loader2,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Mail,
  User,
  Percent,
  X,
  AlertTriangle,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCartStore, type AppliedCoupon } from "@/stores/cart-store"
import { useCurrencyStore, formatPriceForCurrency } from "@/stores/currency-store"
import { useAuth } from "@/providers/auth-provider"
import { formatDataSize } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { DiscountCode } from "@/types/database"
import { usePriceSchedules, calculateCartTotals } from "@/hooks/use-price-schedules"
import { formatPriceWithDiscount } from "@/lib/price-utils"
import { isUnlimitedPackage, getDataTypeLabel } from "@/types/location"

const checkoutSchema = z.object({
  email: z.string().email("Email tidak valid"),
  fullName: z.string().min(2, "Nama lengkap harus diisi"),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function CheckoutPage() {
  const router = useRouter()
  const { user, profile, session } = useAuth()
  const currency = useCurrencyStore((state) => state.currency)
  const {
    items,
    promoCode,
    appliedCoupon,
    getDiscountAmount,
    applyCoupon,
    removePromo,
    isCouponValidForCurrency,
    clearCart,
  } = useCartStore()
  const { priceSchedules, getEffectivePriceForPackage } = usePriceSchedules()

  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [promoInput, setPromoInput] = useState("")
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)

  // Get singleton Supabase client
  const supabase = createClient()

  // Calculate totals with effective prices
  const cartTotals = useMemo(() => {
    return calculateCartTotals(items, priceSchedules, currency)
  }, [items, priceSchedules, currency])

  // Get effective prices for each item
  const itemPrices = useMemo(() => {
    const prices = new Map<string, ReturnType<typeof getEffectivePriceForPackage>>()
    for (const item of items) {
      prices.set(item.package.id, getEffectivePriceForPackage(item.package))
    }
    return prices
  }, [items, getEffectivePriceForPackage])

  // Wait for client-side hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: "",
      fullName: "",
    },
  })

  // Pre-fill form with user data if logged in
  useEffect(() => {
    if (user?.email) {
      setValue("email", user.email)
    }
    if (profile?.full_name) {
      setValue("fullName", profile.full_name)
    }
  }, [user, profile, setValue])

  // Redirect if cart is empty (only after hydration)
  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push("/cart")
    }
  }, [mounted, items, router])

  // Redirect if currency is IDR (only after hydration)
  useEffect(() => {
    if (mounted && currency === "IDR") {
      toast.info("Pembayaran dengan IDR akan segera tersedia. Silakan gunakan USD.")
      router.push("/cart")
    }
  }, [mounted, currency, router])

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return

    setIsApplyingPromo(true)
    setPromoError(null)

    try {
      console.log("[Checkout] Applying promo code:", promoInput.toUpperCase())

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      )

      const queryPromise = supabase
        .from("discount_codes")
        .select("*")
        .eq("code", promoInput.toUpperCase())
        .eq("is_active", true)
        .maybeSingle()  // Use maybeSingle() to return null instead of error when not found

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<typeof queryPromise>

      console.log("[Checkout] Promo query result:", { data, error })

      if (error) {
        console.error("[Checkout] Promo query error:", error)
        setPromoError("Terjadi kesalahan saat memvalidasi kode promo")
        return
      }

      if (!data) {
        setPromoError("Kode promo tidak valid atau sudah tidak aktif")
        return
      }

      const promo = data as DiscountCode

      // Check if promo is expired
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        setPromoError("Kode promo sudah expired")
        return
      }

      // Check if not yet started
      if (promo.starts_at && new Date(promo.starts_at) > new Date()) {
        setPromoError("Kode promo belum aktif")
        return
      }

      // Check usage limit
      if (promo.max_uses && (promo.current_uses || 0) >= promo.max_uses) {
        setPromoError("Kode promo sudah mencapai batas penggunaan")
        return
      }

      // Check currency compatibility for fixed discounts
      if (promo.discount_type === "fixed") {
        // Check if it's a USD-only coupon
        if (promo.currency_code === "USD" && currency !== "USD") {
          setPromoError(`Kode promo ini hanya berlaku untuk pembayaran USD`)
          return
        }
        // Check if it's an IDR-only coupon
        if (promo.currency_code === "IDR" && currency !== "IDR") {
          setPromoError(`Kode promo ini hanya berlaku untuk pembayaran IDR`)
          return
        }
        // Check if coupon has IDR value but we're using USD
        if (currency === "USD" && !promo.discount_value && promo.discount_value_idr) {
          setPromoError(`Kode promo ini hanya berlaku untuk pembayaran IDR`)
          return
        }
        // Check if coupon has USD value but we're using IDR
        if (currency === "IDR" && promo.discount_value && !promo.discount_value_idr) {
          setPromoError(`Kode promo ini hanya berlaku untuk pembayaran USD`)
          return
        }
      }

      // Check minimum purchase using effective subtotal
      const effectiveSubtotal = cartTotals.subtotal
      if (currency === "USD") {
        const subtotalCents = effectiveSubtotal * 10000 // esim-access format: 1 USD = 10000
        if (promo.min_purchase_cents && subtotalCents < promo.min_purchase_cents) {
          setPromoError(`Minimum pembelian ${formatPriceForCurrency(promo.min_purchase_cents, 0, "USD")}`)
          return
        }
      } else {
        if (promo.min_purchase_idr && effectiveSubtotal < promo.min_purchase_idr) {
          setPromoError(`Minimum pembelian ${formatPriceForCurrency(0, promo.min_purchase_idr, "IDR")}`)
          return
        }
      }

      // Create applied coupon object
      const couponData: AppliedCoupon = {
        code: promo.code,
        discountType: promo.discount_type as "percentage" | "fixed",
        discountValue: promo.discount_value,
        discountValueIdr: promo.discount_value_idr,
        currencyCode: promo.currency_code,
        maxDiscountCents: promo.max_discount_cents,
        maxDiscountIdr: promo.max_discount_idr,
      }

      // Calculate discount based on effective subtotal
      let discount = 0
      if (promo.discount_type === "percentage") {
        discount = (effectiveSubtotal * promo.discount_value) / 100 // percentage: 10% = 10/100
        if (currency === "USD" && promo.max_discount_cents) {
          discount = Math.min(discount, promo.max_discount_cents / 10000) // esim-access format
        } else if (currency === "IDR" && promo.max_discount_idr) {
          discount = Math.min(discount, promo.max_discount_idr)
        }
      } else {
        // Fixed amount discount
        if (currency === "USD") {
          discount = promo.discount_value / 10000 // esim-access format: 1 USD = 10000
        } else {
          discount = promo.discount_value_idr || 0
        }
      }

      applyCoupon(couponData, discount)
      toast.success(`Kode promo ${promo.code} berhasil diterapkan!`)
      setPromoInput("")
    } catch (err) {
      console.error("[Checkout] Promo error:", err)
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan"
      if (errorMessage === "Request timeout") {
        setPromoError("Koneksi timeout. Silakan coba lagi.")
      } else {
        setPromoError("Terjadi kesalahan. Silakan coba lagi.")
      }
    } finally {
      setIsApplyingPromo(false)
    }
  }

  const onSubmit = async (data: CheckoutFormData) => {
    // Double check currency
    if (currency === "IDR") {
      toast.error("Pembayaran dengan IDR belum tersedia")
      return
    }

    setIsLoading(true)
    console.log("[Checkout] Starting checkout process...")

    // IMPORTANT: Get fresh items directly from store to avoid stale closure issue
    // This ensures we have the latest cart state including periodNum for unlimited packages
    const freshItems = useCartStore.getState().items

    console.log("[Checkout] Items from store at submit time:", JSON.stringify(freshItems.map(i => ({
      id: i.id,
      package_code: i.package.package_code,
      periodNum: i.periodNum,
      periodNumType: typeof i.periodNum,
      quantity: i.quantity,
    })), null, 2))

    try {
      // Prepare cart items for the edge function
      const cartItems = freshItems.map((item) => {
        console.log("[Checkout] Cart item raw:", {
          package_code: item.package.package_code,
          periodNum: item.periodNum,
          periodNumType: typeof item.periodNum,
          quantity: item.quantity,
        })
        return {
          package_code: item.package.package_code,
          quantity: item.quantity,
          period_num: item.periodNum ?? null, // For daily/unlimited packages - use ?? to preserve 0 if ever needed
        }
      })

      console.log("[Checkout] Final cartItems to send:", JSON.stringify(cartItems, null, 2))
      console.log("[Checkout] Calling create-checkout edge function...")

      // Get fresh access token - use session from auth context (kept fresh by onAuthStateChange)
      // If authenticated user but session expired, refresh it first
      let accessToken = session?.access_token
      if (user && !accessToken) {
        // Session might be stale, try to refresh
        console.log("[Checkout] Session expired, attempting refresh...")
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error("[Checkout] Session refresh failed:", refreshError)
          // Fallback to anon key for guest checkout
          accessToken = undefined
        } else {
          accessToken = refreshedSession?.session?.access_token
        }
      }

      // Use access_token for authenticated users, anon key for guests
      const authToken = accessToken || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      console.log("[Checkout] Auth mode:", accessToken ? "authenticated" : "guest")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            items: cartItems,
            customer_email: data.email,
            customer_name: data.fullName,
            discount_code: promoCode || undefined,
            currency: "USD",
            user_id: user?.id || undefined,
          }),
        }
      )

      const result = await response.json()
      console.log("[Checkout] Edge function response:", result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create checkout")
      }

      // Clear cart after successful order creation
      clearCart()

      // Redirect to Paddle checkout
      if (result.checkout_url) {
        console.log("[Checkout] Redirecting to Paddle:", result.checkout_url)
        toast.success("Mengarahkan ke halaman pembayaran...")
        window.location.href = result.checkout_url
      } else {
        // Fallback: redirect to order page if no checkout URL
        console.warn("[Checkout] No checkout_url returned, redirecting to order page")
        toast.success("Pesanan berhasil dibuat!")
        router.push(`/order/success?order=${result.order_number}`)
      }
    } catch (error) {
      console.error("[Checkout] Error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      if (errorMessage.includes("timeout")) {
        toast.error("Koneksi timeout. Silakan coba lagi.")
      } else if (errorMessage.includes("Cart is empty")) {
        toast.error("Keranjang kosong. Silakan tambahkan produk.")
        router.push("/packages")
      } else if (errorMessage.includes("No valid packages")) {
        toast.error("Paket tidak tersedia. Silakan pilih paket lain.")
      } else {
        toast.error(errorMessage || "Terjadi kesalahan saat membuat pesanan")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while waiting for hydration
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Will redirect in useEffect
  if (items.length === 0 || currency === "IDR") {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Use effective prices for totals
  const { subtotal, originalSubtotal, scheduleDiscount, hasScheduleDiscount } = cartTotals
  const couponDiscount = getDiscountAmount(currency)
  const isCouponValid = isCouponValidForCurrency(currency)
  const validCouponDiscount = isCouponValid ? couponDiscount : 0
  const total = Math.max(0, subtotal - validCouponDiscount)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild>
          <Link href="/cart">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Keranjang
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pembeli</CardTitle>
              <CardDescription>
                {user
                  ? "Data akan digunakan untuk pengiriman QR code eSIM."
                  : "Isi data Anda untuk melanjutkan pembelian tanpa login."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@contoh.com"
                    {...register("email")}
                    disabled={!!user?.email}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    QR code aktivasi eSIM akan dikirim ke email ini.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    <User className="inline h-4 w-4 mr-1" />
                    Nama Lengkap
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Nama lengkap Anda"
                    {...register("fullName")}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Promo Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <Tag className="inline h-5 w-5 mr-2" />
                Kode Promo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promoCode ? (
                <div className="space-y-3">
                  {isCouponValid ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-700 dark:text-green-400">{promoCode}</p>
                          <p className="text-sm text-green-600 dark:text-green-500">
                            Hemat {currency === "USD"
                              ? formatPriceForCurrency(validCouponDiscount * 10000, 0, "USD")
                              : formatPriceForCurrency(0, validCouponDiscount, "IDR")
                            }
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removePromo}
                        className="text-green-600 hover:text-green-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>
                          Kupon "{promoCode}" tidak berlaku untuk {currency}.
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removePromo}
                          className="ml-2"
                        >
                          Hapus
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Masukkan kode promo"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      disabled={isApplyingPromo}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={isApplyingPromo || !promoInput.trim()}
                    >
                      {isApplyingPromo ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Terapkan"
                      )}
                    </Button>
                  </div>
                  {promoError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {promoError}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <ShoppingCart className="inline h-5 w-5 mr-2" />
                Pesanan Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const effectivePrice = itemPrices.get(item.package.id)
                const periodMultiplier = item.periodNum || 1
                const totalMultiplier = item.quantity * periodMultiplier
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{item.package.display_name || item.package.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDataSize(item.package.volume_bytes)} •{" "}
                        {item.periodNum ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.periodNum} Hari
                          </span>
                        ) : (
                          <>
                            {item.package.duration}{" "}
                            {item.package.duration_unit === "day" ? "Hari" : item.package.duration_unit || "Hari"}
                          </>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.package.category && (
                          <Badge variant="outline">
                            {item.package.category}
                          </Badge>
                        )}
                        {isUnlimitedPackage(item.package.data_type) && (
                          <Badge variant="secondary" className="text-xs">
                            {getDataTypeLabel(item.package.data_type)}
                          </Badge>
                        )}
                        {effectivePrice?.hasDiscount && effectivePrice.badgeText && (
                          <Badge
                            variant="secondary"
                            style={effectivePrice.badgeColor ? { backgroundColor: effectivePrice.badgeColor, color: "white" } : undefined}
                          >
                            {effectivePrice.badgeText}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {effectivePrice?.hasDiscount && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPriceForCurrency(
                            effectivePrice.originalUsdCents * totalMultiplier,
                            effectivePrice.originalIdr * totalMultiplier,
                            currency
                          )}
                        </p>
                      )}
                      <p className="font-semibold">
                        {effectivePrice ? formatPriceForCurrency(
                          effectivePrice.finalUsdCents * totalMultiplier,
                          effectivePrice.finalIdr * totalMultiplier,
                          currency
                        ) : formatPriceForCurrency(
                          item.package.price_usd_cents * totalMultiplier,
                          item.package.price_idr * totalMultiplier,
                          currency
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.periodNum && `${item.periodNum} hari`}
                        {item.periodNum && item.quantity > 1 && " × "}
                        {item.quantity > 1 && `x${item.quantity}`}
                        {!item.periodNum && item.quantity === 1 && `x${item.quantity}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {/* Original subtotal if there's schedule discount */}
                {hasScheduleDiscount && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Harga Normal</span>
                    <span className="line-through">
                      {currency === "USD"
                        ? formatPriceForCurrency(originalSubtotal * 10000, 0, "USD")
                        : formatPriceForCurrency(0, originalSubtotal, "IDR")
                      }
                    </span>
                  </div>
                )}
                {/* Schedule discount */}
                {hasScheduleDiscount && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Diskon Promo
                    </span>
                    <span>
                      -{currency === "USD"
                        ? formatPriceForCurrency(scheduleDiscount * 10000, 0, "USD")
                        : formatPriceForCurrency(0, scheduleDiscount, "IDR")
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({items.length} paket)</span>
                  <span>
                    {currency === "USD"
                      ? formatPriceForCurrency(subtotal * 10000, 0, "USD")
                      : formatPriceForCurrency(0, subtotal, "IDR")
                    }
                  </span>
                </div>
                {validCouponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Kupon ({promoCode})
                    </span>
                    <span>
                      -{currency === "USD"
                        ? formatPriceForCurrency(validCouponDiscount * 10000, 0, "USD")
                        : formatPriceForCurrency(0, validCouponDiscount, "IDR")
                      }
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  {currency === "USD"
                    ? formatPriceForCurrency(total * 10000, 0, "USD")
                    : formatPriceForCurrency(0, total, "IDR")
                  }
                </span>
              </div>

              {/* Currency Info */}
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">
                  Pembayaran dalam <span className="font-semibold text-foreground">{currency}</span>
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex-col space-y-4">
              <Button
                type="submit"
                form="checkout-form"
                className="w-full"
                size="lg"
                disabled={isLoading || (promoCode !== null && !isCouponValid)}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Bayar Sekarang
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Dengan melanjutkan, Anda menyetujui{" "}
                <Link href="/terms" className="underline">
                  Syarat & Ketentuan
                </Link>{" "}
                kami.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
