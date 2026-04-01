import { SiteHeader } from "@/components/layout/site-header";

export default function ContactPage() {
  return (
    <div>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Contact</h1>
        <p className="mt-4 text-muted-foreground">Hubungi pasukan KutipYuran untuk demo, onboarding, dan sokongan deployment.</p>
      </main>
    </div>
  );
}

