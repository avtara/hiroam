"use client"

import { useState, useMemo } from "react"
import { formatDate, formatDataSize } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  Copy,
  Globe,
  Signal,
  MapPin,
  ChevronDown,
  ChevronUp,
  Search,
  Info,
  AlertTriangle,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react"
import type { EsimProfile, EsimPackage } from "@/types/database"
import { TopupDialog } from "@/components/topup/TopupDialog"
import { toast } from "sonner"

// Status configuration
const esimStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: "Menunggu Aktivasi", variant: "secondary", icon: AlertCircle },
  GOT_RESOURCE: { label: "Siap Digunakan", variant: "default", icon: CheckCircle },
  got_resource: { label: "Siap Digunakan", variant: "default", icon: CheckCircle },
  IN_USE: { label: "Aktif", variant: "default", icon: CheckCircle },
  in_use: { label: "Aktif", variant: "default", icon: CheckCircle },
  active: { label: "Aktif", variant: "default", icon: CheckCircle },
  installed: { label: "Terinstal", variant: "default", icon: CheckCircle },
  released: { label: "Siap Aktivasi", variant: "default", icon: CheckCircle },
  expired: { label: "Kadaluarsa", variant: "destructive", icon: XCircle },
  depleted: { label: "Habis", variant: "destructive", icon: XCircle },
  USED_UP: { label: "Habis", variant: "destructive", icon: XCircle },
  used_up: { label: "Habis", variant: "destructive", icon: XCircle },
}

// Operator type from esim_packages.operator_list
interface Operator {
  name: string
  network?: string
}

interface OperatorLocation {
  location: string
  operators: Operator[]
}

interface EsimDetailCardProps {
  esim: EsimProfile
  packageInfo?: Partial<EsimPackage> | null
  userEmail: string
  userId?: string
  showActivationCodes?: boolean
  orderNumber?: string // For guest users top-up
}

function calculateDataUsagePercent(used: number | null, total: number | null): number {
  if (!used || !total) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

function calculateTimeLeft(expiresAt: string | null): string {
  if (!expiresAt) return "-"
  const now = new Date()
  const expiry = new Date(expiresAt)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return "Berakhir"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days} hari ${hours} jam`
  if (hours > 0) return `${hours} jam`
  return "< 1 jam"
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} berhasil disalin`)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={copyToClipboard}
    >
      <Copy className="h-4 w-4" />
    </Button>
  )
}

export function EsimDetailCard({
  esim,
  packageInfo,
  userEmail,
  userId,
  showActivationCodes = true,
  orderNumber,
}: EsimDetailCardProps) {
  const [topupDialogOpen, setTopupDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [coverageOpen, setCoverageOpen] = useState(false)
  const [operatorSearch, setOperatorSearch] = useState("")

  // For refunded profiles, show as "expired" to users
  const isRefunded = esim.refund_status === "refunded"
  const isCancelled = esim.esim_status === "cancelled"
  const isInactive = isRefunded || isCancelled

  const status = isRefunded ? "expired" : (esim.esim_status || "pending")
  const config = esimStatusConfig[status] || esimStatusConfig.pending
  const StatusIcon = config.icon

  const totalData = esim.data_total_bytes || 0
  const usedData = esim.data_used_bytes || 0
  const remainingData = Math.max(0, totalData - usedData)
  const usagePercent = calculateDataUsagePercent(usedData, totalData)
  const timeLeft = calculateTimeLeft(esim.expires_at)

  const isExpired = esim.expires_at && new Date(esim.expires_at) < new Date()

  // Check if can topup - per eSIM Access API: "Top ups can be requested while the eSIM is in New, In Use or Depleted status, but not after eSIM expiry"
  // Also check if the original package supports top-up (from profile or package info)
  const validTopupStatuses = [
    "RELEASED", "released",     // New - not yet installed
    "IN_USE", "in_use",         // Active - currently being used
    "GOT_RESOURCE", "got_resource", // Active - has resources
    "USED_UP", "used_up",       // Depleted - data used up
    "DEPLETED", "depleted",     // Depleted - alternative name
    "active", "installed"       // Internal statuses
  ]
  // Check esim.support_topup first (from profile), fallback to packageInfo
  const packageSupportsTopup = esim.support_topup !== false && packageInfo?.support_topup !== false
  const canTopup = validTopupStatuses.includes(esim.esim_status || "") && !isExpired && !isRefunded && packageSupportsTopup

  // Parse operator list for coverage
  const operatorList = useMemo((): OperatorLocation[] => {
    if (!packageInfo?.operator_list) return []
    // Cast through unknown since operator_list is Json type from Supabase
    const list = packageInfo.operator_list as unknown
    if (!Array.isArray(list)) return []
    return list as OperatorLocation[]
  }, [packageInfo?.operator_list])

  // Filter operators by search
  const filteredOperators = useMemo(() => {
    if (!operatorSearch.trim()) return operatorList
    const search = operatorSearch.toLowerCase()
    return operatorList.filter(loc =>
      loc.location.toLowerCase().includes(search) ||
      loc.operators.some(op => op.name.toLowerCase().includes(search))
    )
  }, [operatorList, operatorSearch])

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
          {/* Inactive/Refunded Notice */}
          {isInactive && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <p>eSIM ini telah {isCancelled ? "dibatalkan" : "kadaluarsa"} dan tidak dapat digunakan.</p>
            </div>
          )}

          {/* Cannot Topup Notice */}
          {!isInactive && !packageSupportsTopup && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Tidak Mendukung Top Up</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Paket ini tidak dapat di-top up. Beli paket baru jika kuota habis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============ BASIC INFORMATION SECTION ============ */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              Informasi Dasar
            </h4>
            <div className="grid gap-3 text-sm">
              {/* ICCID */}
              {esim.iccid && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">ICCID</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs">{esim.iccid}</code>
                    <CopyButton text={esim.iccid} label="ICCID" />
                  </div>
                </div>
              )}

              {/* IMSI */}
              {esim.imsi && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">IMSI</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-xs">{esim.imsi}</code>
                    <CopyButton text={esim.imsi} label="IMSI" />
                  </div>
                </div>
              )}

              {/* Activation Time */}
              {esim.enabled_at && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Waktu Aktivasi
                  </span>
                  <span className="font-medium">{formatDate(esim.enabled_at)}</span>
                </div>
              )}

              {/* Update Time */}
              {esim.updated_at && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Terakhir Diperbarui
                  </span>
                  <span className="font-medium">{formatDate(esim.updated_at)}</span>
                </div>
              )}

              {/* Short URL */}
              {esim.short_url && !isInactive && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    URL Singkat
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={esim.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs truncate max-w-[150px]"
                    >
                      {esim.short_url}
                    </a>
                    <CopyButton text={esim.short_url} label="URL Singkat" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============ ACTIVATION CODES SECTION ============ */}
          {showActivationCodes && !isInactive && (esim.sm_dp_address || esim.activation_code || esim.manual_code) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <QrCode className="h-4 w-4" />
                  Kode Aktivasi
                </h4>
                <div className="space-y-3">
                  {/* SM-DP+ Address */}
                  {esim.sm_dp_address && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">SM-DP+ Address</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                          {esim.sm_dp_address}
                        </code>
                        <CopyButton text={esim.sm_dp_address} label="SM-DP+ Address" />
                      </div>
                    </div>
                  )}

                  {/* Activation Code */}
                  {esim.activation_code && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Activation Code</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                          {esim.activation_code}
                        </code>
                        <CopyButton text={esim.activation_code} label="Activation Code" />
                      </div>
                    </div>
                  )}

                  {/* Manual Code */}
                  {esim.manual_code && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Manual Activation Code</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                          {esim.manual_code}
                        </code>
                        <CopyButton text={esim.manual_code} label="Manual Code" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ============ DEVICE INFORMATION SECTION ============ */}
          {(esim.eid || esim.device_brand || esim.device_model || esim.device_type) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <MonitorSmartphone className="h-4 w-4" />
                  Informasi Perangkat
                </h4>
                <div className="grid gap-3 text-sm">
                  {/* Device Brand & Model */}
                  {(esim.device_brand || esim.device_model) && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Perangkat</span>
                      <span className="font-medium">
                        {[esim.device_brand, esim.device_model].filter(Boolean).join(" ")}
                      </span>
                    </div>
                  )}

                  {/* Device Type */}
                  {esim.device_type && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Tipe Perangkat</span>
                      <span className="font-medium">{esim.device_type}</span>
                    </div>
                  )}

                  {/* EID */}
                  {esim.eid && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">EID</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs">
                          {esim.eid.slice(0, 8)}...{esim.eid.slice(-4)}
                        </code>
                        <CopyButton text={esim.eid} label="EID" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ============ DATA PLAN SECTION ============ */}
          <Separator />
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4" />
              Paket Data
            </h4>

            {/* Data Usage Bar */}
            {totalData > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Penggunaan Data</span>
                  <span className="text-sm font-medium">
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

            {/* Data Plan Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Data Left */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wifi className="h-4 w-4" />
                  <span>Sisa Data</span>
                </div>
                <p className="font-medium">{formatDataSize(remainingData)}</p>
              </div>

              {/* Time Left */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Sisa Waktu</span>
                </div>
                <p className="font-medium">{timeLeft}</p>
              </div>

              {/* Expiry Date */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Berakhir</span>
                </div>
                <p className="font-medium">
                  {esim.expires_at ? formatDate(esim.expires_at) : "-"}
                </p>
              </div>

              {/* Billing Start */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Billing Mulai</span>
                </div>
                <p className="font-medium">
                  {esim.enabled_at ? formatDate(esim.enabled_at) : "-"}
                </p>
              </div>

              {/* Total Duration from package */}
              {packageInfo?.duration && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>Total Waktu</span>
                  </div>
                  <p className="font-medium">
                    {packageInfo.duration} {packageInfo.duration_unit === "day" ? "Hari" : packageInfo.duration_unit || "Hari"}
                  </p>
                </div>
              )}

              {/* Breakout IP */}
              {packageInfo?.ip_export && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Globe className="h-4 w-4" />
                    <span>Breakout IP</span>
                  </div>
                  <p className="font-medium">{packageInfo.ip_export}</p>
                </div>
              )}

              {/* APN */}
              {esim.apn && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Signal className="h-4 w-4" />
                    <span>APN</span>
                  </div>
                  <p className="font-medium">{esim.apn}</p>
                </div>
              )}

              {/* Region */}
              {packageInfo?.location_codes && packageInfo.location_codes.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span>Region</span>
                  </div>
                  <p className="font-medium">{packageInfo.location_codes.join(", ")}</p>
                </div>
              )}
            </div>
          </div>

          {/* ============ COVERAGE SECTION ============ */}
          {operatorList.length > 0 && (
            <>
              <Separator />
              <Collapsible open={coverageOpen} onOpenChange={setCoverageOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between py-2">
                    <h4 className="font-medium flex items-center gap-2 text-sm">
                      <Signal className="h-4 w-4" />
                      Cakupan & Operator ({operatorList.length} lokasi)
                    </h4>
                    {coverageOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3">
                  {/* Network Speed Badge */}
                  {packageInfo?.speed && (
                    <Badge variant="outline" className="mb-2">
                      <Signal className="h-3 w-3 mr-1" />
                      {packageInfo.speed}
                    </Badge>
                  )}

                  {/* Search Operators */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari operator atau lokasi..."
                      value={operatorSearch}
                      onChange={(e) => setOperatorSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>

                  {/* Operator List */}
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {filteredOperators.map((loc, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {loc.location}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {loc.operators.map((op, opIdx) => (
                            <Badge
                              key={opIdx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {op.name}
                              {op.network && (
                                <span className="ml-1 text-muted-foreground">
                                  ({op.network})
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                    {filteredOperators.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Tidak ditemukan operator dengan kata kunci tersebut
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* ============ TOPUP HISTORY ============ */}
          {(esim.topup_count ?? 0) > 0 && (
            <Badge variant="secondary" className="text-xs">
              {esim.topup_count}x top-up
            </Badge>
          )}

          {/* ============ ACTIONS ============ */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {esim.qr_code && !isInactive && (
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
          <div className="flex flex-col items-center p-4 space-y-4">
            {esim.qr_code && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={esim.qr_code}
                alt="QR Code Aktivasi eSIM"
                className="max-w-[250px] rounded-lg border bg-white p-4"
              />
            )}
            {esim.qr_code && (
              <div className="flex items-center gap-2 w-full">
                <Input
                  value={esim.qr_code}
                  readOnly
                  className="text-xs font-mono"
                />
                <CopyButton text={esim.qr_code} label="URL QR Code" />
              </div>
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
        orderNumber={orderNumber}
      />
    </>
  )
}
