import type { Metadata } from "next";
import LogoutScreen from "@/components/LogoutScreen";

export const metadata: Metadata = { title: "Logout", robots: { index: false, follow: false } };
export default function LogoutPage() { return <LogoutScreen />; }
