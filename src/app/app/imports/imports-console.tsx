"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

type ImportJobItem = {
  id: string;
  originalFileName: string;
  status: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: string;
  rowErrors: Array<{
    id: string;
    rowNumber: number;
    message: string;
  }>;
};

export function ImportsConsole({
  feePlans,
  importJobs,
}: {
  feePlans: Array<{ id: string; name: string }>;
  importJobs: ImportJobItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [manualForm, setManualForm] = useState({
    fullName: "",
    phoneNumber: "",
  });
  const [manualAssignments, setManualAssignments] = useState<Array<{ feePlanId: string; quantity: string }>>([
    { feePlanId: "", quantity: "1" },
  ]);
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState("customers-import.csv");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setCsvContent(text);
    setOriginalFileName(file.name);
    setPreview(null);
    setPreviewJobId(null);
    setStatusMessage(`Loaded ${file.name}. Preview it before importing.`);
  }

  async function createManualCustomer() {
    setStatusMessage("");
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: manualForm.fullName,
        phoneNumber: manualForm.phoneNumber,
        planAssignments: manualAssignments
          .filter((assignment) => assignment.feePlanId && Number(assignment.quantity) > 0)
          .map((assignment) => ({
            feePlanId: assignment.feePlanId,
            quantity: Number(assignment.quantity),
          })),
      }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to add customer.");
      return;
    }

    setManualForm({
      fullName: "",
      phoneNumber: "",
    });
    setManualAssignments([{ feePlanId: "", quantity: "1" }]);
    setStatusMessage("Customer added successfully.");
    startTransition(() => router.refresh());
  }

  async function previewImport() {
    setStatusMessage("");
    const response = await fetch("/api/imports/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvContent, originalFileName }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to preview CSV import.");
      return;
    }

    setPreview(payload.preview);
    setPreviewJobId(payload.job.id);
    setStatusMessage(`Preview generated and saved as import job ${payload.job.id}.`);
    startTransition(() => router.refresh());
  }

  async function applyImport(importJobId?: string) {
    setStatusMessage("");
    const response = await fetch("/api/imports/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importJobId ? { importJobId } : { csvContent, originalFileName }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setStatusMessage(payload?.error || "Failed to queue import.");
      return;
    }

    setStatusMessage(`Import job ${payload.importJobId} queued. Refreshing history...`);
    startTransition(() => router.refresh());
  }

  const hasBlockingIssues = !preview || preview.errors.length > 0 || preview.duplicates.length > 0 || !previewJobId;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <CardTitle>Manual Add</CardTitle>
          <CardDescription className="mt-2">Add a customer one by one with the plans and quantities they need.</CardDescription>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            onChange={(event) => setManualForm((current) => ({ ...current, fullName: event.target.value }))}
            placeholder="Name"
            value={manualForm.fullName}
          />
          <Input
            onChange={(event) => setManualForm((current) => ({ ...current, phoneNumber: event.target.value }))}
            placeholder="WhatsApp Number"
            value={manualForm.phoneNumber}
          />
        </div>

        <div className="space-y-3">
          {manualAssignments.map((assignment, index) => (
            <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]" key={`${index}-${assignment.feePlanId}`}>
              <select
                className="h-10 rounded-xl border bg-background px-3 text-sm"
                onChange={(event) =>
                  setManualAssignments((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, feePlanId: event.target.value } : item)),
                  )
                }
                value={assignment.feePlanId}
              >
                <option value="">Select plan</option>
                {feePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <Input
                min="1"
                onChange={(event) =>
                  setManualAssignments((current) =>
                    current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: event.target.value } : item)),
                  )
                }
                placeholder="Quantity"
                type="number"
                value={assignment.quantity}
              />
              <Button
                onClick={() =>
                  setManualAssignments((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))
                }
                type="button"
                variant="outline"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            onClick={() => setManualAssignments((current) => [...current, { feePlanId: "", quantity: "1" }])}
            type="button"
            variant="outline"
          >
            Add Plan
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isPending || !manualForm.fullName.trim() || !manualForm.phoneNumber.trim()} onClick={createManualCustomer} type="button">
            Add Customer
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>CSV Import</CardTitle>
          <CardDescription className="mt-2">
            Preview a customer import, then queue the import job for background processing with history and row-level failure tracking.
          </CardDescription>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input accept=".csv,text/csv" className="text-sm" onChange={handleFileChange} type="file" />
          <Button disabled={isPending || !csvContent.trim()} onClick={previewImport} type="button" variant="outline">
            Preview Import
          </Button>
          <Button disabled={isPending || hasBlockingIssues} onClick={() => applyImport(previewJobId || undefined)} type="button">
            Queue Import Job
          </Button>
        </div>

        <div className="rounded-xl bg-muted p-4 text-sm">
          <p className="font-semibold">Supported fee plans in this workspace</p>
          <p className="mt-2 text-muted-foreground">{feePlans.length ? feePlans.map((plan) => plan.name).join(", ") : "No fee plans found yet."}</p>
        </div>

        <textarea
          className="min-h-48 w-full rounded-xl border bg-background p-4 text-sm outline-none"
          onChange={(event) => {
            setCsvContent(event.target.value);
            setPreview(null);
            setPreviewJobId(null);
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

      <Card>
        <CardTitle>Import History</CardTitle>
        <CardDescription className="mt-2">Recent import jobs with statuses and the first row-level failures for operator review.</CardDescription>
        <div className="mt-4 space-y-3">
          {importJobs.length ? (
            importJobs.map((job) => (
              <div key={job.id} className="rounded-xl bg-muted p-4 text-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{job.originalFileName}</p>
                    <p className="text-muted-foreground">Created: {new Date(job.createdAt).toLocaleString()}</p>
                    <p>
                      Status: {job.status} | Total: {job.totalRows} | Success: {job.successRows} | Failed: {job.failedRows}
                    </p>
                    {job.rowErrors.length ? (
                      <div className="pt-2 text-xs text-destructive">
                        {job.rowErrors.map((error) => (
                          <p key={error.id}>
                            Row {error.rowNumber}: {error.message}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {job.status === "FAILED" || job.status === "DRAFT" ? (
                    <Button disabled={isPending} onClick={() => applyImport(job.id)} size="sm" type="button" variant="outline">
                      Re-run Import
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No import jobs yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
