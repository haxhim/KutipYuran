import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z.string().min(3),
  contactPerson: z.string().min(3),
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

