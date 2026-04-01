export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ status?: string; billing?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold">Payment Return</h1>
      <p className="mt-4 text-muted-foreground">Status: {params.status || "pending"}</p>
      <p className="text-muted-foreground">Billing ID: {params.billing || "-"}</p>
    </main>
  );
}

