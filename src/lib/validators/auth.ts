import { z } from "zod";
import { email } from "./common";

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(256),
  rememberMe: z.boolean().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(256),
    newPassword: z.string().min(10, "Use at least 10 characters").max(128),
    confirmPassword: z.string().max(128),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a different password",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    newPassword: z.string().min(10, "Use at least 10 characters").max(128),
    confirmPassword: z.string().max(128),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
