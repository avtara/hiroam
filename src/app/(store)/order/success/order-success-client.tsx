"use client"

import Link from "next/link"
import { CheckCircle, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCountryName, getLocationImageUrl } from "@/lib/locations"
import { formatCurrency } from "@/lib/utils"
import type { Order, OrderItem } from "@/types/database"

interface PackageDetails {
  package_code: string
  location_code: string | null
  volume: number | null
  duration: number | null
  duration_unit: string | null
}

interface EnrichedOrderItem extends OrderItem {
  packageDetails?: PackageDetails
}

interface OrderSuccessClientProps {
  order: Order
  orderItems: EnrichedOrderItem[]
  txHash?: string
}

function formatDataVolume(volumeMB: number | null): string {
  if (!volumeMB) return "Unlimited"
  if (volumeMB >= 1024) {
    return `${Math.round(volumeMB / 1024)} GB`
  }
  return `${volumeMB} MB`
}

function formatDuration(duration: number | null, unit: string | null): string {
  if (!duration) return ""
  const durationUnit = unit === "day" || unit === "days" ? "Day" : unit || "Day"
  return `${duration} ${durationUnit}${duration > 1 ? "s" : ""}`
}

export function OrderSuccessClient({ order, orderItems, txHash }: OrderSuccessClientProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-sm">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold mb-2">Payment Success</h1>
          <p className="text-sm text-muted-foreground">
            Order detail available in my order page and sent to your e-mail.
          </p>
        </div>

        {/* Order Items */}
        <div className="space-y-3 mb-6">
          {orderItems.map((item) => {
            const locationCode = item.packageDetails?.location_code || ""
            const countryName = locationCode ? getCountryName(locationCode) : item.package_name.split(" ")[0]
            const flagUrl = locationCode
              ? getLocationImageUrl(null, locationCode)
              : null
            const volume = formatDataVolume(item.packageDetails?.volume || null)
            const duration = formatDuration(
              item.packageDetails?.duration || null,
              item.packageDetails?.duration_unit || null
            )

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  {flagUrl ? (
                    <img
                      src={flagUrl}
                      alt={countryName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{countryName}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Wifi className="w-3 h-3" />
                      <span>{volume}</span>
                      {duration && (
                        <>
                          <span className="mx-1">-</span>
                          <span>{duration}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="font-semibold">
                  {formatCurrency(item.total_cents, order.currency_code || "USD", "paddle")}
                </p>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button asChild className="w-full bg-teal-500 hover:bg-teal-600 rounded-full h-12">
            <Link href="/orders">
              My Order
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-full h-12">
            <Link href="/">
              Go to Homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
