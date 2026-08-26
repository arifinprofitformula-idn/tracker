import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
import PwaRegister from "@/components/PwaRegister";

const title = "Arva Tracker — Langkah kecil, perubahan besar";
const description = "Daily plan dan progress tracker untuk membangun konsistensi harian, satu langkah kecil setiap hari.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tracker.arvadigital.my.id"),
  title: { default: title, template: "%s | Arva Tracker" },
  description,
  applicationName: "Arva Tracker",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon.ico" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Arva Tracker", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Arva Tracker",
    title,
    description,
    images: [{ url: "/brand/og-arva-tracker.png", width: 1200, height: 630, alt: "Arva Tracker — Langkah kecil, perubahan besar" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/og-arva-tracker.png"],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#071A2D", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" suppressHydrationWarning><body suppressHydrationWarning>{children}<PwaRegister /></body></html>;
}
