import { z } from "zod";
import { ACADEMIC_YEARS } from "../models/User.js";

// Length and shape rules live here so the client can import the same module and
// the two can never drift. A client-side rule is a convenience; this one is the
// rule, because anyone can post to the API without ever opening the app.
const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be 80 characters or fewer.");

// Composition rules rather than a single score: a length floor plus three of
// four character classes rejects the passwords that actually get guessed,
// without pushing anyone towards P@ssw0rd1.
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
  // No rules on the way in. Login must never tell a user their old password was
  // too short; that would confirm which addresses have accounts.
  password: z.string().min(1, "Enter your password.").max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "That reset link is not valid."),
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
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Send at least one field to update.",
  });
