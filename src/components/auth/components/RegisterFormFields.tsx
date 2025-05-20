
import React from "react";
import { z } from "zod";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InvitationCheckResult } from "@/services/invitationService";

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormFieldsProps {
  form: UseFormReturn<RegisterFormValues>;
  invitation: InvitationCheckResult | null;
}

export const RegisterFormFields = ({ form, invitation }: RegisterFormFieldsProps) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base">Email</FormLabel>
            <FormControl>
              <Input
                type="email"
                placeholder="email@example.com"
                disabled={invitation?.valid && !!invitation.invitation?.email}
                className="p-3 h-12 rounded-md"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base">Password</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="********"
                className="p-3 h-12 rounded-md"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base">Confirm Password</FormLabel>
            <FormControl>
              <Input
                type="password"
                placeholder="********"
                className="p-3 h-12 rounded-md"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
