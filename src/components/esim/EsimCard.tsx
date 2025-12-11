"use client"

import { useState } from "react"
import { formatDate, formatDataSize } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Smartphone,
  Wifi,
  Calendar,
  QrCode,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MonitorSmartphone,
} from "lucide-react"
import type { EsimProfile } from "@/types/database"
import { TopupDialog } from "@/components/topup/TopupDialog"

const esimStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Menunggu Aktivasi", variant: "secondary", icon: AlertCircle },
  GOT_RESOURCE: { label: "Siap Digunakan", variant: "default", icon: CheckCircle },
  got_resource: { label: "Siap Digunakan", variant: "default", icon: CheckCircle },
  IN_USE: { label: "Aktif", variant: "default", icon: CheckCircle },
  in_use: { label: "Aktif", variant: "default", icon: CheckCircle },
  active: { label: "Aktif", variant: "default", icon: CheckCircle },
  installed: { label: "Terinstal", variant: "default", icon: CheckCircle },
  expired: { label: "Kadaluarsa", variant: "destructive", icon: XCircle },
  depleted: { label: "Habis", variant: "destructive", icon: XCircle },
  USED_UP: { label: "Habis", variant: "destructive", icon: XCircle },
}

interface EsimCardProps {
  esim: EsimProfile
  userEmail: string
  userId: string
}

function calculateDataUsagePercent(used: number | null, total: number | null): number {
  if (!used || !total) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

export function EsimCard({ esim, userEmail, userId }: EsimCardProps) {
  const [topupDialogOpen, setTopupDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  // For refunded profiles, show as "expired" to users
  const isRefunded = esim.refund_status === "refunded"
  const status = isRefunded ? "expired" : (esim.esim_status || "pending")
  const config = esimStatusConfig[status] || esimStatusConfig.pending
  const StatusIcon = config.icon

  const totalData = esim.data_total_bytes || 0
  const usedData = esim.data_used_bytes || 0
  const remainingData = Math.max(0, totalData - usedData)
  const usagePercent = calculateDataUsagePercent(usedData, totalData)

  const isExpired = esim.expires_at && new Date(esim.expires_at) < new Date()

  // Check if can topup - per eSIM Access API: "Top ups can be requested while the eSIM is in New, In Use or Depleted status, but not after eSIM expiry"
  // Also check if the original package supports top-up
  const validTopupStatuses = [
    "RELEASED", "released",     // New - not yet installed
    "IN_USE", "in_use",         // Active - currently being used
    "GOT_RESOURCE", "got_resource", // Active - has resources
    "USED_UP", "used_up",       // Depleted - data used up
    "DEPLETED", "depleted",     // Depleted - alternative name
    "active", "installed"       // Internal statuses
  ]
  const packageSupportsTopup = esim.support_topup !== false // Default to true if not set
  const canTopup = validTopupStatuses.includes(esim.esim_status || "") && !isExpired && !isRefunded && packageSupportsTopup

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                eSIM
              </CardTitle>
              <CardDescription className="mt-1">
                {esim.iccid ? (
                  <>ICCID: <span className="font-mono">{esim.iccid}</span></>
                ) : (
                  <>Order: <span className="font-mono">{esim.esim_order_no || "-"}</span></>
                )}
              </CardDescription>
            </div>
            <Badge variant={config.variant}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Usage */}
          {totalData > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Wifi className="h-4 w-4" />
                  Penggunaan Data
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDataSize(remainingData)} tersisa
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{formatDataSize(usedData)} terpakai</span>
                <span>{formatDataSize(totalData)} total</span>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span>Kadaluarsa</span>
              </div>
              <p className="font-medium">
                {esim.expires_at ? formatDate(esim.expires_at) : "-"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span>Diaktifkan</span>
              </div>
              <p className="font-medium">
                {esim.enabled_at ? formatDate(esim.enabled_at) : "-"}
              </p>
            </div>
          </div>

          {/* Device Info - shows when eSIM has been downloaded to a device */}
          {(esim.device_brand || esim.device_model) && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MonitorSmartphone className="h-4 w-4" />
                <span>Perangkat</span>
              </div>
              <p className="font-medium">
                {esim.device_brand} {esim.device_model}
              </p>
              {esim.eid && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  EID: {esim.eid.slice(0, 8)}...{esim.eid.slice(-4)}
                </p>
              )}
            </div>
          )}

          {/* Topup History Badge */}
          {(esim.topup_count ?? 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              {esim.topup_count}x top-up
            </Badge>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {esim.qr_code && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Lihat QR Code
              </Button>
            )}
            {canTopup && (
              <Button
                size="sm"
                onClick={() => setTopupDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Top Up
              </Button>
            )}
            {isExpired && !isRefunded && (
              <p className="text-sm text-muted-foreground">
                eSIM sudah kadaluarsa.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Aktivasi</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {esim.qr_code && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={esim.qr_code}
                alt="QR Code Aktivasi eSIM"
                className="max-w-[250px] rounded-lg border bg-white p-4"
              />
            )}
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Scan QR code ini dengan pengaturan eSIM di perangkat Anda
          </p>
        </DialogContent>
      </Dialog>

      {/* Topup Dialog */}
      <TopupDialog
        open={topupDialogOpen}
        onOpenChange={setTopupDialogOpen}
        profileId={esim.id}
        profileIccid={esim.iccid}
        customerEmail={userEmail}
        userId={userId}
      />
    </>
  )
}
