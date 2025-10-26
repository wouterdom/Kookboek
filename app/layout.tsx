import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { WeekMenuProvider } from "@/contexts/weekmenu-context";
import { GroceryCountProvider } from "@/components/grocery-count-provider";
import { CategoriesProvider } from "@/contexts/categories-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kookboek - Recepten App",
  description: "Je digitale kookboek voor het bewaren en organiseren van familierecep­ten",
  applicationName: "Kookboek",
  authors: [{ name: "Kookboek Team" }],
  generator: "Next.js",
  keywords: ["recepten", "kookboek", "koken", "bakken", "familie recepten"],
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
    shortcut: "/favicon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kookboek",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Kookboek",
    title: "Kookboek - Recepten App",
    description: "Je digitale kookboek voor het bewaren en organiseren van familierecep­ten",
  },
  twitter: {
    card: "summary",
    title: "Kookboek - Recepten App",
    description: "Je digitale kookboek voor het bewaren en organiseren van familierecep­ten",
  },
};

export const viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <CategoriesProvider>
          <GroceryCountProvider>
            <WeekMenuProvider>
              {children}
            </WeekMenuProvider>
          </GroceryCountProvider>
        </CategoriesProvider>
        <Toaster />
      </body>
    </html>
  );
}
