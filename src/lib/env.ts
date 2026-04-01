import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  STORAGE_ROOT: z.string().default("./storage"),
  UPLOAD_ROOT: z.string().default("./uploads"),
  WHATSAPP_SESSION_ROOT: z.string().default("./storage/whatsapp"),
  CHIP_API_BASE_URL: z.string().url().default("https://gate.chip-in.asia/api/v1"),
  CHIP_BRAND_ID: z.string().default(""),
  CHIP_API_TOKEN: z.string().default(""),
  TOYYIBPAY_API_BASE_URL: z.string().url().default("https://toyyibpay.com"),
  TOYYIBPAY_CATEGORY_CODE: z.string().default(""),
  TOYYIBPAY_SECRET_KEY: z.string().default(""),
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(0),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  STORAGE_ROOT: process.env.STORAGE_ROOT,
  UPLOAD_ROOT: process.env.UPLOAD_ROOT,
  WHATSAPP_SESSION_ROOT: process.env.WHATSAPP_SESSION_ROOT,
  CHIP_API_BASE_URL: process.env.CHIP_API_BASE_URL,
  CHIP_BRAND_ID: process.env.CHIP_BRAND_ID,
  CHIP_API_TOKEN: process.env.CHIP_API_TOKEN,
  TOYYIBPAY_API_BASE_URL: process.env.TOYYIBPAY_API_BASE_URL,
  TOYYIBPAY_CATEGORY_CODE: process.env.TOYYIBPAY_CATEGORY_CODE,
  TOYYIBPAY_SECRET_KEY: process.env.TOYYIBPAY_SECRET_KEY,
  PLATFORM_FEE_PERCENT: process.env.PLATFORM_FEE_PERCENT,
});

