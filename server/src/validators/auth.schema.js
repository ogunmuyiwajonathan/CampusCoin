import { z } from "zod";
import { ACADEMIC_YEARS } from "../models/User.js";

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be 80 characters or fewer.");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password must be 200 characters or fewer.")
  .refine((value) => /[a-z]/.test(value), "Password needs a lowercase letter.")
  .refine((value) => /[A-Z]/.test(value), "Password needs an uppercase letter.")
  .refine((value) => /\d/.test(value), "Password needs a number.");

export const registerSchema = z.object({
  name,
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6 digit code from your email."),
  password,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(200),
    newPassword: password,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Your new password must be different from the current one.",
    path: ["newPassword"],
  });

export const updateProfileSchema = z
  .object({
    name: name.optional(),
    academic_year: z.enum(ACADEMIC_YEARS).nullable().optional(),
    allowance_baseline: z.number().min(0, "Allowance cannot be negative.").max(100_000_000).nullable().optional(),
    monthly_savings_goal: z.number().min(0, "Savings goal cannot be negative.").max(100_000_000).nullable().optional(),
    profileOnboarded: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });
