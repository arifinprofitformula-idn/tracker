import AuthForm from "@/components/AuthForm";
import { safeAuthRedirect } from "@/lib/authRedirect";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" redirectTo={safeAuthRedirect(next)} />;
}
