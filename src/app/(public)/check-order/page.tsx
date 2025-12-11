"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search, Loader2, Package, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Order, OrderItem, EsimProfile, EsimPackage } from "@/types/database"
import { EsimDetailCard } from "@/components/esim/EsimDetailCard"

const checkOrderSchema = z.object({
  orderNumber: z.string().min(1, "Nomor pesanan harus diisi"),
  email: z.string().email("Email tidak valid"),
})

type CheckOrderFormData = z.infer<typeof checkOrderSchema>

interface EsimProfileWithPackage extends EsimProfile {
  packageInfo?: Partial<EsimPackage> | null
}

interface OrderWithDetails extends Order {
  order_items: OrderItem[]
  esim_profiles: EsimProfileWithPackage[]
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Menunggu Pembayaran", variant: "secondary", icon: Clock },
  paid: { label: "Dibayar", variant: "default", icon: CheckCircle },
  processing: { label: "Diproses", variant: "secondary", icon: Package },
  completed: { label: "Selesai", variant: "default", icon: CheckCircle },
  cancelled: { label: "Dibatalkan", variant: "destructive", icon: XCircle },
  failed: { label: "Gagal", variant: "destructive", icon: AlertCircle },
}

export default function CheckOrderPage() {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Create Supabase client only after component mounts (client-side only)
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null
    return createClient()
  }, [])

  // Wait for hydration to complete
  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckOrderFormData>({
    resolver: zodResolver(checkOrderSchema),
  })

  const onSubmit = async (data: CheckOrderFormData) => {
    if (!supabase) {
      setError("Layanan belum siap. Silakan muat ulang halaman.")
      return
    }

    setIsLoading(true)
    setError(null)
    setOrder(null)

    try {
      // Get order first
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", data.orderNumber)
        .eq("customer_email", data.email)
        .single()

      if (orderError || !orderData) {
        setError("Pesanan tidak ditemukan. Pastikan nomor pesanan dan email sudah benar.")
        return
      }

      // Get order items
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderData.id)

      // Get esim profiles
      const { data: esimProfiles } = await supabase
        .from("esim_profiles")
        .select("*")
        .eq("order_id", orderData.id)

      // Get package info for each order item to show coverage, topup support, etc.
      const packageIds = [...new Set(
        orderItems?.map(item => item.package_id).filter((id): id is string => id !== null) || []
      )]

      let packages: Record<string, Partial<EsimPackage>> = {}
      if (packageIds.length > 0) {
        const { data: packageData } = await supabase
          .from("esim_packages")
          .select("id, support_topup, operator_list, ip_export, speed, duration, duration_unit, location_codes, location_names")
          .in("id", packageIds)

        if (packageData) {
          packages = packageData.reduce((acc, pkg) => {
            acc[pkg.id] = pkg
            return acc
          }, {} as Record<string, Partial<EsimPackage>>)
        }
      }

      // Map package info to each esim profile
      const profilesWithPackage: EsimProfileWithPackage[] = (esimProfiles || []).map(profile => {
        const orderItem = orderItems?.find(item => item.id === profile.order_item_id)
        const packageInfo = orderItem?.package_id ? packages[orderItem.package_id] : null
        return {
          ...profile,
          packageInfo
        }
      })

      const orderWithDetails: OrderWithDetails = {
        ...orderData,
        order_items: orderItems || [],
        esim_profiles: profilesWithPackage,
      }

      setOrder(orderWithDetails)
    } catch (err) {
      console.error("Error fetching order:", err)
      setError("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  const status = order?.status || "pending"
  const StatusIcon = statusConfig[status]?.icon || Clock

  // Show loading while waiting for client-side hydration
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Memuat halaman...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">Cek Status Pesanan</h1>
          <p className="mt-2 text-muted-foreground">
            Masukkan nomor pesanan dan email untuk melihat status pesanan Anda.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cari Pesanan</CardTitle>
            <CardDescription>
              Gunakan nomor pesanan yang dikirim ke email Anda setelah pembelian.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Nomor Pesanan</Label>
                <Input
                  id="orderNumber"
                  placeholder="HR-XXXXXX-XXXX"
                  {...register("orderNumber")}
                  disabled={isLoading}
                />
                {errors.orderNumber && (
                  <p className="text-sm text-destructive">{errors.orderNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Cek Pesanan
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Result */}
        {order && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detail Pesanan</CardTitle>
                  <CardDescription>{order.order_number}</CardDescription>
                </div>
                <Badge variant={statusConfig[status]?.variant || "secondary"}>
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {statusConfig[status]?.label || status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Package Info */}
              {order.order_items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Paket eSIM</h3>
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-muted p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{item.package_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity || 1}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(item.total_cents, order.currency_code || "IDR", "paddle")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Order Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Pesanan</p>
                  <p className="font-medium">{order.created_at ? formatDate(order.created_at) : "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.customer_email}</p>
                </div>
              </div>

              <Separator />

              {/* Payment Info */}
              <div>
                <h3 className="font-semibold mb-2">Ringkasan Pembayaran</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal_cents, order.currency_code || "IDR", "paddle")}</span>
                  </div>
                  {(order.total_discount_cents || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Diskon</span>
                      <span>-{formatCurrency(order.total_discount_cents || 0, order.currency_code || "IDR", "paddle")}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(order.total_cents, order.currency_code || "IDR", "paddle")}</span>
                  </div>
                </div>
              </div>

              {/* Pending order - show pay button or expired message */}
              {status === "pending" && (() => {
                const createdAt = order.created_at ? new Date(order.created_at) : null
                const now = new Date()
                const hoursSinceCreated = createdAt
                  ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
                  : 0
                const isExpired = hoursSinceCreated > 24

                if (isExpired) {
                  return (
                    <>
                      <Separator />
                      <div className="rounded-lg bg-destructive/10 p-4">
                        <p className="text-sm text-destructive font-medium">
                          Pesanan ini telah kedaluwarsa.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Silakan buat pesanan baru jika Anda masih ingin membeli paket eSIM.
                        </p>
                      </div>
                    </>
                  )
                }

                if (order.paddle_checkout_url) {
                  return (
                    <>
                      <Separator />
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                              Pesanan menunggu pembayaran
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Selesaikan pembayaran dalam {Math.ceil(24 - hoursSinceCreated)} jam
                            </p>
                          </div>
                          <Button size="sm" asChild>
                            <a href={order.paddle_checkout_url} target="_blank" rel="noopener noreferrer">
                              Lanjutkan Pembayaran
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </>
                  )
                }

                return null
              })()}

              {/* eSIM Profiles (if available) */}
              {order.esim_profiles.length > 0 && (status === "completed" || status === "paid" || status === "processing") && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4">
                      Informasi eSIM ({order.esim_profiles.length})
                    </h3>
                    <div className="space-y-6">
                      {order.esim_profiles.map((profile) => (
                        <EsimDetailCard
                          key={profile.id}
                          esim={profile}
                          packageInfo={profile.packageInfo}
                          userEmail={order.customer_email}
                          showActivationCodes={true}
                          orderNumber={order.order_number}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
