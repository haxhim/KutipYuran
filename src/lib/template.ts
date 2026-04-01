import { BillingRecord, Customer, Organization } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

type RenderTemplateInput = {
  body: string;
  customer: Pick<Customer, "fullName" | "firstName">;
  organization: Pick<Organization, "name" | "senderDisplayName">;
  billingRecord: Pick<BillingRecord, "totalAmount" | "dueDate" | "referenceNo" | "paymentLinkUrl"> & {
    planSummary?: string;
  };
};

export function renderMessageTemplate(input: RenderTemplateInput) {
  const replacements: Record<string, string> = {
    name: input.customer.fullName,
    first_name: input.customer.firstName || input.customer.fullName.split(" ")[0] || input.customer.fullName,
    sender_name: input.organization.senderDisplayName,
    organization_name: input.organization.name,
    amount_due: formatCurrency(input.billingRecord.totalAmount.toString()),
    payment_link: input.billingRecord.paymentLinkUrl || "",
    due_date: new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium" }).format(input.billingRecord.dueDate),
    reference_no: input.billingRecord.referenceNo,
    plan_summary: input.billingRecord.planSummary || "",
  };

  return input.body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => replacements[key] ?? "");
}

