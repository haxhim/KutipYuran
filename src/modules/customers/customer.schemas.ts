import { z } from "zod";

export const customerSchema = z.object({
  fullName: z.string().min(2),
  firstName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phoneNumber: z.string().min(8),
  notes: z.string().optional(),
});

