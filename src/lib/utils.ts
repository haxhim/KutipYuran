import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number, currency = "MYR") {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

