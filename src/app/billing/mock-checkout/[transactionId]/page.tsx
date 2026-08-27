import BillingMockCheckout from "@/components/BillingMockCheckout";

export default async function Page({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  return <BillingMockCheckout transactionId={transactionId} />;
}
