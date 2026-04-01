import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const highlights = [
  "WhatsApp QR connection with restart-safe session persistence",
  "CSV import for tuition, school, club, and class fee databases",
  "Gateway and manual payment tracking with wallet and payout logic",
  "Staged reminder campaigns with queue pacing and retry safety",
];

export default function HomePage() {
  return (
    <div>
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
              Malaysia-friendly fee collection automation
            </p>
            <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight">
              Kutip yuran lebih tersusun dengan WhatsApp reminder, payment link, dan laporan kutipan.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Built for tuition centres, schools, clubs, kelas mengaji, and small organizations that need billing,
              reminders, and wallet-based payout tracking in one SaaS.
            </p>
            <div className="mt-8 flex gap-4">
              <Button asChild size="lg">
                <Link href="/register">Create organization</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
          <Card className="space-y-4 bg-gradient-to-br from-card to-accent">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">MVP includes</p>
            {highlights.map((item) => (
              <div key={item} className="rounded-xl bg-background/80 p-4 text-sm font-medium">
                {item}
              </div>
            ))}
          </Card>
        </div>
      </section>
    </div>
  );
}

