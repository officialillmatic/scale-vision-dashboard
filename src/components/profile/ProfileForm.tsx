import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileAvatar } from "./ProfileAvatar";
import { Loader2 } from "lucide-react";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  email: z.string().email("Please enter a valid email").min(5).max(100),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.user_metadata?.name || "",
        email: user.email || "",
      });
    }
  }, [user, form]);
  
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "No user found",
        variant: "destructive",
      });
      return;
    }

    // Check if anything actually changed
    const currentName = user.user_metadata?.name || "";
    if (currentName === values.name) {
      toast({
        title: "No changes",
        description: "No changes were made to your profile",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await updateUserProfile({ name: values.name });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: error?.message || "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if form has changes
  const hasChanges = () => {
    const currentValues = form.getValues();
    const currentName = user?.user_metadata?.name || "";
    return currentName !== currentValues.name;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Update your personal information</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex justify-center mb-6">
          <ProfileAvatar />
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Your name"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      readOnly 
                      disabled 
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed from this form
                  </p>
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isLoading || !hasChanges()}
              className="w-full sm:w-auto"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}