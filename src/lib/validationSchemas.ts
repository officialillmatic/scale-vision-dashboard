
import { z } from "zod";

// Validation schema for team invitation
export const teamInviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.enum(['admin', 'member', 'viewer'], {
    required_error: "Please select a role"
  })
});

// Validation schema for profile settings
export const profileSettingsSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  bio: z.string().max(500, { message: "Bio must be less than 500 characters" }).optional()
});

// Validation schema for company settings
export const companySettingsSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Company name must be at least 2 characters" })
    .max(100, { message: "Company name must be less than 100 characters" }),
  industry: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], {
    required_error: "Please select a company size"
  }).optional()
});

// Validation schema for authentication
export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" })
});

export const registerSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters" })
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// Validation schema for call search and filtering
export const callFilterSchema = z.object({
  searchTerm: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'all']).optional(),
  status: z.enum(['completed', 'voicemail', 'no-answer', 'hangup', 'all']).optional()
});
