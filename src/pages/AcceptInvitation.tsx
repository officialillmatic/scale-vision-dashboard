import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Mail, 
  User, 
  Building2, 
  Crown, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  EyeOff,
  Loader2,
  Clock,
  UserPlus
} from 'lucide-react';

interface InvitationData {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id?: string;
  company_name?: string;
  token: string;
  expires_at: string;
  invited_by: string;
  invited_by_email?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  created_at: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (token) {
      fetchInvitation();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      console.log('🔍 Buscando invitación con token:', token);

      const { data, error } = await supabase
  .from('team_invitations')
  .select('*')
  .eq('invitation_token', token)
  .single();

      if (error) {
        console.error('❌ Error fetching invitation:', error);
        toast.error('Invitación no encontrada');
        return;
      }

      if (!data) {
        toast.error('Invitación no encontrada');
        return;
      }

      // Verificar si la invitación ha expirado
      const expiresAt = new Date(data.expires_at);
      const now = new Date();

      if (now > expiresAt) {
        toast.error('Esta invitación ha expirado');
        setInvitation({
          ...data,
          status: 'expired',
          company_name: data.companies?.name || null,
          invited_by_email: data.invited_by_profile?.email
        });
        return;
      }

      if (data.status !== 'pending') {
        toast.warning(`Esta invitación ya fue ${data.status === 'accepted' ? 'aceptada' : 'cancelada'}`);
      }

      setInvitation({
        ...data,
        company_name: data.companies?.name || null,
        invited_by_email: data.invited_by_profile?.email
      });

    } catch (error: any) {
      console.error('❌ Error fetching invitation:', error);
      toast.error('Error al cargar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    // Validaciones
    if (!formData.password || formData.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setAccepting(true);

    try {
      console.log('👤 Creando cuenta para:', invitation.email);

      // 1. Crear usuario en Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            name: invitation.name,
            role: invitation.role
          }
        }
      });

      if (authError) {
        console.error('❌ Error creating auth user:', authError);
        toast.error(`Error creando cuenta: ${authError.message}`);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast.error('Error: No se pudo crear la cuenta');
        return;
      }

      // 2. Crear perfil de usuario
const { error: profileError } = await supabase
  .from('profiles')
  .insert({
    id: authData.user.id,
    name: formData.fullName,     // ✅ Correcto
    email: invitation.email,     // ✅ Correcto
    role: invitation.role        // ✅ Correcto
  });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        toast.error('Error creando perfil de usuario');
        return;
      }

      // 3. Crear registro en public.users
      const { error: publicUserError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role
        });

      if (publicUserError) {
        console.warn('⚠️ Error creating public user:', publicUserError);
      }

      // 4. Crear créditos iniciales
      const { error: creditsError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          current_balance: 0,
          total_credits_purchased: 0,
          total_credits_used: 0
        });

      if (creditsError) {
        console.warn('⚠️ Error creating credits:', creditsError);
      }

      // 5. Si tiene empresa, agregarlo como miembro
      if (invitation.company_id) {
  const { error: companyError } = await supabase
    .from('company_members')
    .insert({
      company_id: invitation.company_id,
      user_id: authData.user.id,
      role: invitation.role
    });
  
  if (companyError) console.warn('Error agregando a empresa:', companyError);
}
      

      /// 6. Marcar invitación como aceptada
const { error: updateError } = await supabase
  .from('team_invitations')
  .update({
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    accepted_by: authData.user.id
  })
  .eq('id', invitation.id);

if (updateError) {
  console.warn('⚠️ Error updating invitation:', updateError);
}

toast.success('¡Cuenta creada exitosamente! 🎉', {
  description: 'Bienvenido a DrScale AI'
});

// Redirigir al dashboard después de 2 segundos
setTimeout(() => {
  navigate('/dashboard');
}, 2000);

    } catch (error: any) {
      console.error('❌ Error accepting invitation:', error);
      toast.error(`Error inesperado: ${error.message}`);
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Usuario</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">Cargando invitación...</h3>
            <p className="text-muted-foreground">Verificando tu invitación</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Token de invitación inválido</h3>
            <p className="text-muted-foreground mb-4">
              El enlace de invitación no es válido o está corrupto.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invitación no encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Esta invitación no existe o ha sido eliminada.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'expired' || new Date() > new Date(invitation.expires_at)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invitación expirada</h3>
            <p className="text-muted-foreground mb-2">
              Esta invitación expiró el {formatDate(invitation.expires_at)}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Contacta a {invitation.invited_by_email} para solicitar una nueva invitación.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invitación ya aceptada</h3>
            <p className="text-muted-foreground mb-4">
              Esta invitación ya fue aceptada anteriormente.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl">¡Has sido invitado a DrScale AI!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Completa tu registro para unirte al equipo
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información de la invitación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                <strong>{invitation.name}</strong> ({invitation.email})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Rol:</span>
                {getRoleBadge(invitation.role)}
              </div>
            </div>

            {invitation.company_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Empresa: <strong>{invitation.company_name}</strong></span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-600">
                Invitado por: {invitation.invited_by_email}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-600">
                Expira: {formatDate(invitation.expires_at)}
              </span>
            </div>
          </div>

          {/* Formulario de contraseña */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Crear contraseña *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Confirmar contraseña *
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repetir contraseña"
              />
            </div>
          </div>

          {/* Información de seguridad */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-green-800 font-medium">Información segura</p>
                <ul className="text-green-700 text-xs mt-1 space-y-1">
                  <li>• Tu contraseña será encriptada</li>
                  <li>• Tendrás acceso completo al sistema</li>
                  <li>• Recibirás créditos iniciales</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={accepting || !formData.password || !formData.confirmPassword}
              className="w-full"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aceptar invitación y crear cuenta
                </>
              )}
            </Button>

            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full"
              disabled={accepting}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
