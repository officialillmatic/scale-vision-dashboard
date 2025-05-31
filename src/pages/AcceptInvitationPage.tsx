
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { checkInvitation, acceptInvitation } from '@/services/invitation';

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de invitación no válido');
      setLoading(false);
      return;
    }

    // Verificar la invitación
    const verifyInvitation = async () => {
      try {
        const result = await checkInvitation(token);
        if (result.valid) {
          setInvitation(result.invitation);
        } else {
          setError(result.error || 'Invitación no válida o expirada');
        }
      } catch (err) {
        setError('Error al verificar la invitación');
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      // Aquí necesitarías implementar la lógica de aceptación
      // Por ahora, simularemos que funciona
      const success = await acceptInvitation(token, 'user-id-placeholder');
      if (success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login'); // Redirigir al login
        }, 3000);
      } else {
        setError('Error al aceptar la invitación');
      }
    } catch (err) {
      setError('Error al procesar la invitación');
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
            <CardTitle className="text-2xl text-green-700">¡Invitación Aceptada!</CardTitle>
            <CardDescription>
              Te has unido exitosamente al equipo. Serás redirigido al login en unos segundos.
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
            <CardTitle className="text-2xl text-red-700">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
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
            <AlertTriangle className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Invitación a Dr. Scale AI</CardTitle>
          <CardDescription>
            Has sido invitado a unirte al equipo
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {invitation && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Email:</span> {invitation.email}
                </div>
                <div>
                  <span className="font-medium">Rol:</span> 
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
                    {invitation.role}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Empresa:</span> {invitation.company_name}
                </div>
              </div>
            </div>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Al aceptar esta invitación, tendrás acceso a Dr. Scale AI con el rol de {invitation?.role}.
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
                  Aceptando...
                </>
              ) : (
                'Aceptar Invitación'
              )}
            </Button>
            
            <Button 
              onClick={handleDecline}
              variant="outline"
              disabled={accepting}
              className="flex-1"
            >
              Rechazar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitationPage;
