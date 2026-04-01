import { SiteHeader } from "@/components/layout/site-header";

export default function FAQPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold">FAQ</h1>
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Adakah ini sesuai untuk sekolah dan pusat tuisyen?</h2>
            <p className="mt-2 text-muted-foreground">Ya. KutipYuran direka untuk kutipan yuran, reminder WhatsApp, dan laporan pembayaran.</p>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold">Bagaimana pembayaran gateway diuruskan?</h2>
            <p className="mt-2 text-muted-foreground">Pembayaran gateway masuk ke akaun master platform dan direkodkan ke wallet organisasi sebelum payout diminta.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

