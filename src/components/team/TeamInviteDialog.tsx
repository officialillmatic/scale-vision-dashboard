
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TeamInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>;
  isInviting: boolean;
}

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.enum(['admin', 'member', 'viewer'], {
    required_error: "Please select a role",
  })
});

type FormValues = z.infer<typeof formSchema>;

export function TeamInviteDialog({ 
  isOpen, 
  onClose,
  onInvite,
  isInviting
}: TeamInviteDialogProps) {
  const { company } = useAuth();
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'member'
    }
  });
  
  const handleSubmit = async (values: FormValues) => {
    setError(null);
    setSendingInvitation(true);
    try {
      console.log("Submitting invitation for:", values.email, "with role:", values.role);
      const success = await onInvite(values.email, values.role);
      console.log("Invitation result:", success);
      
      if (success) {
        form.reset();
        onClose();
      } else {
        setError("Failed to send invitation. Please try again or contact support.");
      }
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSendingInvitation(false);
    }
  };
  
  const isSubmitting = isInviting || sendingInvitation;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your team. They'll get an email with instructions.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">
                        Admin
                        <span className="text-xs text-gray-500 block">Full access to all settings and team management</span>
                      </SelectItem>
                      <SelectItem value="member">
                        Member
                        <span className="text-xs text-gray-500 block">Can upload calls and use the platform</span>
                      </SelectItem>
                      <SelectItem value="viewer">
                        Viewer
                        <span className="text-xs text-gray-500 block">Can only view calls and reports</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending Invitation
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
