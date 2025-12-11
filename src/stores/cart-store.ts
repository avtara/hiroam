import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { EsimPackage } from "@/types/database"
import type { CurrencyCode } from "./currency-store"

export interface CartItem {
  id: string
  package: EsimPackage
  quantity: number
  periodNum?: number // Number of days for daily/unlimited packages (1-365)
}

export interface AppliedCoupon {
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number // For percentage: the % value, for fixed: value in currency
  discountValueIdr: number | null // For fixed IDR discounts
  currencyCode: string | null // Currency the coupon applies to
  maxDiscountCents: number | null // Max discount for percentage (USD cents)
  maxDiscountIdr: number | null // Max discount for percentage (IDR)
}

interface CartState {
  items: CartItem[]
  promoCode: string | null
  promoDiscount: number // Calculated discount amount
  appliedCoupon: AppliedCoupon | null
  addItem: (pkg: EsimPackage) => void
  addItemWithPeriod: (pkg: EsimPackage, periodNum: number) => void // For daily/unlimited packages
  removeItem: (packageId: string) => void
  updateQuantity: (packageId: string, quantity: number) => void
  updatePeriodNum: (cartItemId: string, periodNum: number) => void // Update days for an item
  clearCart: () => void
  setPromoCode: (code: string | null, discount: number) => void
  applyPromo: (code: string, discount: number) => void
  applyCoupon: (coupon: AppliedCoupon, calculatedDiscount: number) => void
  removePromo: () => void
  getTotal: () => number
  getSubtotal: (currency: CurrencyCode) => number
  getDiscountAmount: (currency: CurrencyCode) => number
  getFinalTotal: (currency: CurrencyCode) => number
  getItemCount: () => number
  isCouponValidForCurrency: (currency: CurrencyCode) => boolean
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promoDiscount: 0,
      appliedCoupon: null,

      addItem: (pkg: EsimPackage) => {
        set((state) => {
          // For items without periodNum, check for exact match
          const existingItem = state.items.find(
            (item) => item.package.id === pkg.id && !item.periodNum
          )

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.package.id === pkg.id && !item.periodNum
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                id: crypto.randomUUID(),
                package: pkg,
                quantity: 1,
              },
            ],
          }
        })
      },

      addItemWithPeriod: (pkg: EsimPackage, periodNum: number) => {
        set((state) => {
          // For items with periodNum, check for exact match (same package AND same period)
          const existingItem = state.items.find(
            (item) => item.package.id === pkg.id && item.periodNum === periodNum
          )

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.package.id === pkg.id && item.periodNum === periodNum
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                id: crypto.randomUUID(),
                package: pkg,
                quantity: 1,
                periodNum,
              },
            ],
          }
        })
      },

      removeItem: (cartItemId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }))
      },

      updateQuantity: (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId ? { ...item, quantity } : item
          ),
        }))
      },

      updatePeriodNum: (cartItemId: string, periodNum: number) => {
        if (periodNum < 1 || periodNum > 365) return

        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId ? { ...item, periodNum } : item
          ),
        }))
      },

      clearCart: () => {
        set({ items: [], promoCode: null, promoDiscount: 0, appliedCoupon: null })
      },

      setPromoCode: (code: string | null, discount: number) => {
        set({ promoCode: code, promoDiscount: discount })
      },

      applyPromo: (code: string, discount: number) => {
        set({ promoCode: code, promoDiscount: discount })
      },

      applyCoupon: (coupon: AppliedCoupon, calculatedDiscount: number) => {
        set({
          promoCode: coupon.code,
          promoDiscount: calculatedDiscount,
          appliedCoupon: coupon,
        })
      },

      removePromo: () => {
        set({ promoCode: null, promoDiscount: 0, appliedCoupon: null })
      },

      getSubtotal: (currency: CurrencyCode) => {
        return get().items.reduce((total, item) => {
          const basePrice = currency === "USD"
            ? item.package.price_usd_cents / 10000 // esim-access format: 1 USD = 10000
            : item.package.price_idr
          // For daily/unlimited packages, multiply by periodNum
          const periodMultiplier = item.periodNum || 1
          return total + basePrice * periodMultiplier * item.quantity
        }, 0)
      },

      isCouponValidForCurrency: (currency: CurrencyCode) => {
        const { appliedCoupon } = get()
        if (!appliedCoupon) return true

        // Percentage coupons work for both currencies
        if (appliedCoupon.discountType === "percentage") {
          return true
        }

        // Fixed amount coupons must match currency
        if (appliedCoupon.currencyCode) {
          return appliedCoupon.currencyCode === currency
        }

        // If coupon has IDR value and currency is IDR, valid
        if (currency === "IDR" && appliedCoupon.discountValueIdr !== null) {
          return true
        }

        // If coupon has USD value (discount_value in cents) and currency is USD, valid
        if (currency === "USD" && appliedCoupon.discountValue > 0) {
          return true
        }

        return false
      },

      getDiscountAmount: (currency: CurrencyCode) => {
        const { appliedCoupon } = get()
        if (!appliedCoupon) return 0

        const subtotal = get().getSubtotal(currency)

        // Check if coupon is valid for this currency
        if (!get().isCouponValidForCurrency(currency)) {
          return 0
        }

        if (appliedCoupon.discountType === "percentage") {
          let discount = (subtotal * appliedCoupon.discountValue) / 100 // percentage calculation: 10% = 10/100

          // Apply max discount cap (stored in esim-access format)
          if (currency === "USD" && appliedCoupon.maxDiscountCents) {
            discount = Math.min(discount, appliedCoupon.maxDiscountCents / 10000)
          } else if (currency === "IDR" && appliedCoupon.maxDiscountIdr) {
            discount = Math.min(discount, appliedCoupon.maxDiscountIdr)
          }

          return discount
        }

        // Fixed amount discount
        if (currency === "IDR") {
          return appliedCoupon.discountValueIdr || 0
        }

        // USD - discount_value is in esim-access format (1 USD = 10000)
        return appliedCoupon.discountValue / 10000
      },

      getTotal: () => {
        // Legacy method - returns IDR total
        const subtotal = get().getSubtotal("IDR")
        const discount = get().getDiscountAmount("IDR")
        return Math.max(0, subtotal - discount)
      },

      getFinalTotal: (currency: CurrencyCode) => {
        const subtotal = get().getSubtotal(currency)
        const discount = get().getDiscountAmount(currency)
        return Math.max(0, subtotal - discount)
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: "hiroam-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        promoCode: state.promoCode,
        promoDiscount: state.promoDiscount,
        appliedCoupon: state.appliedCoupon,
      }),
      // Ensure periodNum is properly typed as number after rehydration
      onRehydrateStorage: () => (state) => {
        if (state && state.items) {
          state.items = state.items.map((item) => ({
            ...item,
            // Ensure periodNum is a number if it exists (handles any string conversion from localStorage)
            periodNum: item.periodNum != null ? Number(item.periodNum) : undefined,
          }))
          console.log("[CartStore] Rehydrated with items:", state.items.map(i => ({
            id: i.id,
            package_code: i.package?.package_code,
            periodNum: i.periodNum,
            periodNumType: typeof i.periodNum,
          })))
        }
      },
    }
  )
)
