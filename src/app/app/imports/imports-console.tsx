"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ImportPreview = {
  previewRows: Array<{
    rowNumber: number;
    name: string;
    waNumber: string;
    normalizedWhatsapp: string;
    assignments: Array<{ planName: string; quantity: number }>;
  }>;
  errors: Array<{ rowNumber: number; message: string }>;
  duplicates: string[];
};

export function ImportsConsole({ feePlans }: { feePlans: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvContent(text);
    setPreview(null);
    setStatusMessage(`Loaded ${file.name}. Preview it before importing.`);
  }

  async function previewImport() {
    setStatusMessage("");
    const response = await fetch("/api/imports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvContent }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to preview CSV import.");
      return;
    }

    setPreview(payload);
    setStatusMessage("Preview generated. Check the rows below before importing.");
  }

  async function applyImport() {
    setStatusMessage("");
    const response = await fetch("/api/imports/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvContent }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to import customers.");
      return;
    }

    setStatusMessage(
      `Imported ${payload.processedRows} row(s): ${payload.createdCustomers} new customer(s), ${payload.updatedCustomers} updated, ${payload.assignmentsUpserted} plan assignment(s).`,
    );
    startTransition(() => router.refresh());
  }

  const hasBlockingIssues = !preview || preview.errors.length > 0 || preview.duplicates.length > 0;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription className="mt-2">
            Import customers and assign fee plans using the template format. Existing customers with the same WhatsApp number will be updated.
          </CardDescription>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input accept=".csv,text/csv" className="text-sm" onChange={handleFileChange} type="file" />
          <Button disabled={isPending || !csvContent.trim()} onClick={previewImport} type="button" variant="outline">
            Preview Import
          </Button>
          <Button disabled={isPending || hasBlockingIssues} onClick={applyImport} type="button">
            Import Customers
          </Button>
        </div>

        <div className="rounded-xl bg-muted p-4 text-sm">
          <p className="font-semibold">Supported fee plans in this workspace</p>
          <p className="mt-2 text-muted-foreground">{feePlans.length ? feePlans.join(", ") : "No fee plans found yet."}</p>
        </div>

        <textarea
          className="min-h-48 w-full rounded-xl border bg-background p-4 text-sm outline-none"
          onChange={(event) => {
            setCsvContent(event.target.value);
            setPreview(null);
          }}
          placeholder={"Name,WaNumber,Plans & Quantity\nAli Bin Ahmad,60129259193,\"Monthly Fee {1}, Exam Fee {1}\""}
          value={csvContent}
        />

        {statusMessage ? <div className="rounded-xl border bg-card px-4 py-3 text-sm">{statusMessage}</div> : null}
      </Card>

      {preview ? (
        <Card className="space-y-4">
          <div>
            <CardTitle>Preview Results</CardTitle>
            <CardDescription className="mt-2">
              Rows: {preview.previewRows.length} | Errors: {preview.errors.length} | Duplicate numbers: {preview.duplicates.length}
            </CardDescription>
          </div>

          {preview.errors.length ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
              {preview.errors.map((error) => (
                <p key={`${error.rowNumber}-${error.message}`}>
                  Row {error.rowNumber}: {error.message}
                </p>
              ))}
            </div>
          ) : null}

          {preview.duplicates.length ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
              Duplicate WhatsApp numbers in this file: {preview.duplicates.join(", ")}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-3">Row</th>
                  <th>Name</th>
                  <th>WhatsApp</th>
                  <th>Assignments</th>
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.map((row) => (
                  <tr key={row.rowNumber} className="border-b align-top">
                    <td className="py-3">{row.rowNumber}</td>
                    <td>{row.name}</td>
                    <td>{row.normalizedWhatsapp || row.waNumber}</td>
                    <td>{row.assignments.map((assignment) => `${assignment.planName} x${assignment.quantity}`).join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
