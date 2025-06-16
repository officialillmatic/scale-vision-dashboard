// src/components/admin/AdminPasswordManager.tsx - PARTE 1
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Key, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  User,
  Mail
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface AdminPasswordManagerProps {
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  onPasswordChanged?: () => void;
  onClose?: () => void;
}

export function AdminPasswordManager({ 
  targetUserId, 
  targetUserEmail, 
  targetUserName,
  onPasswordChanged,
  onClose 
}: AdminPasswordManagerProps) {
  const { user } = useAuth();
  
  // Estados
  const [customPassword, setCustomPassword] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    type: 'custom' | 'temp' | null;
  } | null>(null);

  // Verificar si es super admin
  const SUPER_ADMIN_EMAILS = ['aiagentsdevelopers@gmail.com', 'produpublicol@gmail.com'];
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
  // Función para cambiar contraseña personalizada
  const handleCustomPasswordChange = async () => {
    if (!customPassword.trim()) {
      setResult({
        success: false,
        message: 'Please enter a password',
        type: null
      });
      return;
    }

    if (customPassword.length < 6) {
      setResult({
        success: false,
        message: 'Password must be at least 6 characters long',
        type: null
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('admin_change_user_password', {
        target_user_id: targetUserId,
        new_password: customPassword,
        admin_user_id: user?.id
      });

      if (error) {
        setResult({
          success: false,
          message: `Error: ${error.message}`,
          type: 'custom'
        });
      } else if (data.success) {
        setResult({
          success: true,
          message: `Password changed successfully for ${targetUserEmail}`,
          type: 'custom'
        });
        setCustomPassword('');
        onPasswordChanged?.();
        
        // Auto-cerrar después de 2 segundos en éxito
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.message || 'Failed to change password',
          type: 'custom'
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Exception: ${err.message}`,
        type: 'custom'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para generar contraseña temporal
  const handleTempPasswordGenerate = async () => {
    setLoading(true);
    setResult(null);
    setTempPassword('');

    try {
      const { data, error } = await supabase.rpc('admin_reset_user_password_temp', {
        target_user_id: targetUserId,
        admin_user_id: user?.id
      });

      if (error) {
        setResult({
          success: false,
          message: `Error: ${error.message}`,
          type: 'temp'
        });
      } else if (data.success) {
        setTempPassword(data.temp_password);
        setResult({
          success: true,
          message: `Temporary password generated for ${targetUserEmail}`,
          type: 'temp'
        });
        onPasswordChanged?.();
      } else {
        setResult({
          success: false,
          message: data.message || 'Failed to generate temporary password',
          type: 'temp'
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Exception: ${err.message}`,
        type: 'temp'
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copied to clipboard!');
  };
  // Verificación de acceso
  if (!isSuperAdmin) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">Access Denied: Super Admin required</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render principal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-blue-600" />
              Password Management
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
          
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">{targetUserName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">{targetUserEmail}</span>
            </div>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              Admin Access
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Resultado de la operación */}
          {result && (
            <div className={`p-3 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <p className={`text-sm font-medium ${
                  result.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}
          {/* Sección 1: Contraseña Personalizada */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Key className="h-4 w-4" />
              Set Custom Password
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min 6 characters)"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={handleCustomPasswordChange}
                disabled={loading || !customPassword.trim()}
                className="w-full"
                size="sm"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Set Password'}
              </Button>
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200"></div>

          {/* Sección 2: Contraseña Temporal */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <RefreshCw className="h-4 w-4" />
              Generate Temporary Password
            </h3>
            <Button
              onClick={handleTempPasswordGenerate}
              disabled={loading}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Generate Temp Password'}
            </Button>

            {/* Mostrar contraseña temporal generada */}
            {tempPassword && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-yellow-800">Temporary Password:</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm text-yellow-900 bg-white px-2 py-1 rounded border">
                      {tempPassword}
                    </p>
                    <Button
                      onClick={() => copyToClipboard(tempPassword)}
                      variant="ghost"
                      size="sm"
                      className="text-yellow-700 hover:text-yellow-900"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-yellow-700">
                    ⚠️ Share this password securely with the user.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
            <p>• Password changes take effect immediately</p>
            <p>• All changes are logged for security audit</p>
            <p>• User will NOT receive an email notification</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
