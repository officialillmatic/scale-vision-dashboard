
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CheckCircle, XCircle, AlertTriangle, UserPlus } from 'lucide-react';
import { checkInvitation } from '@/services/invitation';

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation token');
      setLoading(false);
      return;
    }

    const verifyInvitation = async () => {
      try {
        console.log('🔍 Verifying invitation token:', token);
        const result = await checkInvitation(token);
        console.log('✅ Invitation check result:', result);
        
        if (result.valid) {
          setInvitation(result.invitation);
          console.log('📧 Invitation email:', result.invitation?.email);
        } else {
          setError(result.error || 'This invitation link is invalid or has expired');
        }
      } catch (err) {
        console.error('💥 Error verifying invitation:', err);
        setError('Error verifying invitation');
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !invitation) return;

    setAccepting(true);
    try {
      console.log('🎯 Accepting invitation and redirecting to registration...');
      
      // Get the email from invitation or URL parameter
      const invitedEmail = invitation.email || emailParam || '';
      
      setSuccess(true);
      
      // Redirect to registration with token and email pre-filled
      setTimeout(() => {
        const params = new URLSearchParams({
          token: token,
          email: invitedEmail
        });
        navigate(`/register?${params.toString()}`);
      }, 2000);

    } catch (err) {
      console.error("💥 Error accepting invitation:", err);
      setError('Error processing invitation: ' + (err.message || 'Unknown error'));
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-green-700">Perfect!</CardTitle>
            <CardDescription>
              Redirecting you to complete your registration...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-700">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            You've been invited to join Dr. Scale AI
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {invitation && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-blue-900">Email:</span> 
                  <span className="ml-2 text-blue-800">{invitation.email}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Role:</span> 
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
                    {invitation.role}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Company:</span> 
                  <span className="ml-2 text-blue-800">{invitation.company_name}</span>
                </div>
              </div>
            </div>
          )}

          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              By accepting this invitation, you'll join {invitation?.company_name} with the role of {invitation?.role}.
            </AlertDescription>
          </Alert>

          <div className="flex space-x-3">
            <Button 
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Redirecting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            
            <Button 
              onClick={handleDecline}
              variant="outline"
              disabled={accepting}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitationPage;
