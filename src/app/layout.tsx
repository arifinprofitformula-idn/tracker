import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./landing.css";
import PwaRegister from "@/components/PwaRegister";
export const metadata: Metadata = { title: "Tracker System · Coach Arifin", description: "Bangun konsistensi, satu centang setiap hari.", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, title: "Tracker" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#1B2A4A" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="id" suppressHydrationWarning><body suppressHydrationWarning>{children}<PwaRegister /></body></html>; }
