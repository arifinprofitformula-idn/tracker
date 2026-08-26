import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Ubah Password", description: "Perbarui password akun Arva Tracker secara aman.", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <ResetPasswordForm />; }
