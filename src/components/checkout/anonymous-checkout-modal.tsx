"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface AnonymousCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onContinue: () => void;
}

export function AnonymousCheckoutModal({
  open,
  onOpenChange,
  orderId,
  onContinue,
}: AnonymousCheckoutModalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    toast.success("Order ID copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium">
            Anonymous Mode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Even if you&apos;re logged in, this order won&apos;t be recorded on your account.
            Copy this{" "}
            <a
              href={`/check-order?order_id=${orderId}`}
              className="text-teal-600 hover:underline"
            >
              order id
            </a>{" "}
            to keep track of your order.
          </p>

          <div className="space-y-2">
            <Label htmlFor="orderId" className="text-base font-medium">
              Order ID
            </Label>
            <div className="relative">
              <Input
                id="orderId"
                value={orderId}
                readOnly
                className="bg-gray-50 pr-10"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Copy this{" "}
            <a
              href={`/check-order?order_id=${orderId}`}
              className="text-teal-600 hover:underline"
            >
              order id
            </a>{" "}
            to keep track of your order.
          </p>

          <Button
            onClick={onContinue}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-full py-6"
          >
            Continue to checkout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
