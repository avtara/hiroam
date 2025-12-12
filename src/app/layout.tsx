import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { Web3Provider } from "@/providers/web3-provider"
import { Toaster } from "@/components/ui/toast"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "HIROAM - eSIM untuk Perjalanan Internasional",
    template: "%s | HIROAM",
  },
  description:
    "Solusi eSIM terbaik untuk kebutuhan konektivitas internasional Anda. Beli eSIM dengan mudah, aktivasi instan, tanpa perlu kartu fisik.",
  keywords: [
    "eSIM",
    "eSIM Indonesia",
    "eSIM internasional",
    "data roaming",
    "kartu SIM digital",
    "travel SIM",
  ],
  authors: [{ name: "HIROAM" }],
  creator: "HIROAM",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://hiroam.com",
    title: "HIROAM - eSIM untuk Perjalanan Internasional",
    description:
      "Solusi eSIM terbaik untuk kebutuhan konektivitas internasional Anda.",
    siteName: "HIROAM",
  },
  twitter: {
    card: "summary_large_image",
    title: "HIROAM - eSIM untuk Perjalanan Internasional",
    description:
      "Solusi eSIM terbaik untuk kebutuhan konektivitas internasional Anda.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Web3Provider>
              {children}
            </Web3Provider>
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
