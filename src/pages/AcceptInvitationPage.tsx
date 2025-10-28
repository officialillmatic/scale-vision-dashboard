// src/pages/AcceptInvitationPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { checkInvitation, acceptInvitation } from '@/services/invitation';
import { supabase } from '@/integrations/supabase/client'; // keep consistent with your project

type InvitationInfo = {
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | string;
  team_id?: string;
  team_name?: string;
  token?: string;
  expires_at?: string;
};

const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation token');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await checkInvitation(token);
        if (res.valid) {
          setInvitation(res.invitation as InvitationInfo);
        } else {
          setError(res.error || 'This invitation link is invalid or has expired');
        }
      } catch (e: any) {
        setError(e?.message || 'Error verifying invitation');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!token || !invitation) return;
    setAccepting(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      // If not logged in → go to register, preserving token + email
      if (!user) {
        setSuccess(true);
        setTimeout(() => {
          const invitedEmail = invitation.email || emailParam || '';
          const params = new URLSearchParams({ token, email: invitedEmail });
          navigate(`/register?${params.toString()}`);
        }, 800);
        return;
      }

      // Logged in → accept server-side, then go to /team
      await acceptInvitation(token, user.id);
      setSuccess(true);
      setTimeout(() => {
        navigate('/team');
      }, 800);
    } catch (e: any) {
      setError(e?.message || 'Error accepting invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => navigate('/');

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
            <CardTitle className="text-2xl text-green-700">Perfecto</CardTitle>
            <CardDescription>
              Redirigiéndote para completar el proceso…
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
            <CardTitle className="text-2xl text-red-700">Invitación inválida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full" variant="outline">
              Volver al inicio
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
          <CardTitle className="text-2xl">Únete a {invitation?.team_name || 'nuestro equipo'}</CardTitle>
          <CardDescription>Has sido invitado a Dr. Scale AI</CardDescription>
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
                  <span className="font-medium text-blue-900">Rol:</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
                    {String(invitation.role)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-900">Equipo:</span>
                  <span className="ml-2 text-blue-800">{invitation.team_name || '—'}</span>
                </div>
              </div>
            </div>
          )}

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              Al aceptar esta invitación, te unirás a {invitation?.team_name || 'el equipo'} con el rol de {String(invitation?.role)}.
            </AlertDescription>
          </Alert>

          <div className="flex space-x-3">
            <Button onClick={handleAccept} disabled={accepting} className="flex-1">
              {accepting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Procesando…
                </>
              ) : (
                'Aceptar invitación'
              )}
            </Button>

            <Button onClick={handleDecline} variant="outline" disabled={accepting} className="flex-1">
              Rechazar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitationPage;
