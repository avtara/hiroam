import Link from "next/link";
import { cn } from "@/lib/utils";

const footerNavigation = {
  company: [
    { name: "About", href: "/about" },
    { name: "Blog & Guides", href: "#" },
    { name: "Contact", href: "#" },
    { name: "Career", href: "#" },
  ],
  support: [
    { name: "Help Center", href: "/esim-info" },
    { name: "Device Compability", href: "/device-compatibility" },
    { name: "Coverage Map", href: "/store" },
    { name: "Network Status", href: "#" },
  ],
  legal: [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Services", href: "#" },
    { name: "Cookie Policy", href: "#" },
    { name: "Acceptable User", href: "#" },
  ],
};

function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        m
      </div>
      <div className="text-xl font-semibold">
        <span className="text-foreground">Hi</span>
        <span className="text-primary">Roaming</span>
      </div>
    </div>
  );
}

type Props = {
  className?: string;
};

export function Footer({ className }: Props) {
  return (
    <footer className="bg-black">
      <div className={cn("px-2 py-4", className)}>
        <div className="mx-2">
          {/* Footer card */}
          <div className="rounded-[32px] border border-border bg-white px-6 py-8 shadow-[0px_22px_60px_rgba(0,0,0,0.18)] md:px-10 md:py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-10">
              {/* Brand */}
              <div className="col-span-2 md:col-span-3 lg:col-span-1">
                <Link href="/" className="inline-flex items-center">
                  <Brand />
                </Link>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  The smartest way to stay connected while traveling. Premium
                  eSIM data plans in 200+ destinations worldwide.
                </p>
              </div>

              {/* Columns */}
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Company
                </div>
                <ul className="mt-6 space-y-4">
                  {footerNavigation.company.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">
                  Support
                </div>
                <ul className="mt-6 space-y-4">
                  {footerNavigation.support.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-sm font-semibold text-foreground">
                  Legal
                </div>
                <ul className="mt-6 space-y-4">
                  {footerNavigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-border pt-10 text-center text-sm text-muted-foreground">
              Copyright © {new Date().getFullYear()} HiRoaming. All Rights
              Reserved
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
