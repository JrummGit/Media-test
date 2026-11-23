import type { Metadata, Viewport } from "next";
import { Bungee, Space_Grotesk, VT323 } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const bungee = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-bungee" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  title: {
    default: "Press Play Media · Vintage VHS, Cassettes & CDs",
    template: "%s · Press Play Media",
  },
  description:
    "Browse racks of hand-picked vintage VHS tapes, cassettes and CDs. Flip every case front to back before you buy.",
};

export const viewport: Viewport = {
  themeColor: "#120d1f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bungee.variable} ${vt323.variable} ${grotesk.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <CartProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
