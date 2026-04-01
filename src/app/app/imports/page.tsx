import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Imports</h1>
      <Card>
        <CardTitle>CSV Import</CardTitle>
        <p className="mt-4 text-sm text-muted-foreground">
          Download the sample template and post the file to the import API for preview and processing.
        </p>
        <Link href="/templates/customers-template.csv" className="mt-4 inline-block text-sm font-semibold text-primary">
          Download template
        </Link>
      </Card>
    </div>
  );
}

