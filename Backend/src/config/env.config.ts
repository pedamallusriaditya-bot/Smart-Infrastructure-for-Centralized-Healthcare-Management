import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z
    .string()
    .default('5000'),

  DATABASE_URL: z
    .string()
    .min(1, { message: "DATABASE_URL is required" }),

  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, { message: "ACCESS_TOKEN_SECRET must be at least 32 characters long" }),

  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, { message: "REFRESH_TOKEN_SECRET must be at least 32 characters long" }),

  CLIENT_URL: z
    .string()
    .default('http://localhost:5173')
});

// Zod will parse process.env, apply defaults, enforce constraints, 
// and infer the exact TypeScript types for the exported 'env' object.
export const env = envSchema.parse(process.env);