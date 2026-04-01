import { z } from "zod";

export const csvRowSchema = z.object({
  Name: z.string().min(1),
  WaNumber: z.string().min(8),
  "Plans & Quantity": z.string().min(1),
});

