
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Mail, CheckCircle } from "lucide-react";
import { EmailConfigWarning } from '@/components/common/EmailConfigWarning';

interface TeamInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>;
  isInviting: boolean;
}

export const TeamInviteDialog: React.FC<TeamInviteDialogProps> = ({
  isOpen,
  onClose,
  onInvite,
  isInviting
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('📋 [TeamInviteDialog] Form submitted');
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    // Validate email
    if (!email || !validateEmail(email)) {
      console.error('❌ [TeamInviteDialog] Invalid email:', email);
      setError('Please enter a valid email address');
      return;
    }

    // Validate role
    if (!role) {
      console.error('❌ [TeamInviteDialog] No role selected');
      setError('Please select a role');
      return;
    }

    console.log('🚀 [TeamInviteDialog] Sending invitation...');
    console.log('📧 Email:', email);
    console.log('👤 Role:', role);

    try {
      const success = await onInvite(email, role);
      
      if (success) {
        console.log('✅ [TeamInviteDialog] Invitation sent successfully');
        setIsSuccess(true);
        
        // Reset form and close modal after a brief delay
        setTimeout(() => {
          setEmail('');
          setRole('member');
          setError(null);
          setIsSuccess(false);
          onClose();
        }, 2000);
      } else {
        console.error('❌ [TeamInviteDialog] Failed to send invitation');
        setError('Failed to send invitation. Please try again.');
      }
    } catch (err: any) {
      console.error('💥 [TeamInviteDialog] Error:', err);
      setError(err.message || 'Failed to send invitation');
    }
  };

  const handleClose = () => {
    if (!isInviting) {
      setEmail('');
      setRole('member');
      setError(null);
      setIsSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your team with the appropriate role and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <EmailConfigWarning />
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isSuccess && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Invitation sent successfully! The modal will close automatically.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                disabled={isInviting || isSuccess}
                className="w-full"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={role} 
                onValueChange={(value) => setRole(value as 'admin' | 'member' | 'viewer')}
                disabled={isInviting || isSuccess}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">Administrator</span>
                      <span className="text-xs text-muted-foreground">Full access to manage team and settings</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex flex-col">
                      <span className="font-medium">Member</span>
                      <span className="text-xs text-muted-foreground">Can upload and analyze calls</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col">
                      <span className="font-medium">Viewer</span>
                      <span className="text-xs text-muted-foreground">Can only view calls and analytics</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={isInviting || isSuccess}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isInviting || !email || !role || isSuccess}
              className="min-w-[120px]"
            >
              {isInviting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Sent!
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
