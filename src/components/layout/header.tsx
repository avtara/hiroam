"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ShoppingCart, User, ChevronDown, Search } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CurrencySwitcher } from "@/components/currency-switcher";

const navigation = [
  { name: "Store", href: "/store" },
  { name: "Compatibility", href: "/device-compatibility" },
  { name: "Track Order", href: "/check-order" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, profile, signOut } = useAuth();
  const itemCount = useCartStore((state) => state.getItemCount());

  // Wait for client-side hydration to prevent mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-4 z-50 w-full container mx-auto">
      <div className="mx-auto px-4 py-4">
        <nav className="flex h-16 items-center gap-6 rounded-full bg-white px-8">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              m
            </div>
            <span className="text-xl font-semibold">
              <span className="text-foreground">Hi</span>
              <span className="text-primary">Roaming</span>
            </span>
          </Link>

          {/* Search Bar */}
          <div className="relative hidden flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for your destination (e.g., Japan, Europe, USA...)"
              className="h-10 w-full rounded-full border-1 pl-10 pr-4"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-4">
            {/* Cart */}
            <Link href="/cart" className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-transparent"
              >
                <ShoppingCart className="h-6 w-6" />
                {mounted && itemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={profile?.avatar_url || ""}
                        alt={profile?.full_name || ""}
                      />
                      <AvatarFallback>
                        {profile?.full_name?.charAt(0).toUpperCase() ||
                          user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {profile?.full_name && (
                        <p className="font-medium">{profile.full_name}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/orders">Pesanan Saya</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/esims">eSIM Saya</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="hidden rounded-full md:inline-flex">
                <Link href="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </nav>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "container mx-auto px-4 lg:hidden",
          mobileMenuOpen ? "block" : "hidden",
        )}
      >
        <div className="mt-2 rounded-2xl border bg-white shadow-sm">
          <div className="space-y-1 px-4 pb-4 pt-4">
            {/* Mobile Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for your destination..."
                className="h-10 w-full rounded-full border-0 bg-muted pl-10 pr-4"
              />
            </div>

            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-sm font-medium text-foreground hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {!user && (
              <div className="mt-4 flex flex-col space-y-2 px-3">
                <Button asChild className="rounded-full">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
