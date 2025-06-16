// src/components/admin/AdminPasswordManager.tsx - VERSIÓN CORREGIDA

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Key, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Bug,
  User,
  Crown,
  Zap,
  Mail,
  Settings
} from 'lucide-react';

interface AdminPasswordManagerProps {
  targetUserId: string;
  targetUserEmail: string;
  targetUserName: string;
  onPasswordChanged: () => void;
  onClose: () => void;
}

export const AdminPasswordManager: React.FC<AdminPasswordManagerProps> = ({
  targetUserId,
  targetUserEmail,
  targetUserName,
  onPasswordChanged,
  onClose,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [currentMethod, setCurrentMethod] = useState<'auto' | 'bypass' | 'email'>('auto');

  // Generar contraseña segura
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];
    
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Función de diagnóstico
  const debugUser = async () => {
    setLoading(true);
    try {
      console.log('🔍 [DEBUG] Diagnosing user:', targetUserId, targetUserEmail);
      
      const { data, error } = await supabase.rpc('diagnose_user_issue', {
        user_identifier: targetUserId
      });

      console.log('🔍 [DEBUG] Diagnosis result:', data);
      
      if (error) {
        console.error('❌ [DEBUG] Diagnosis error:', error);
        toast.error(`Diagnosis error: ${error.message}`);
        return;
      }

      setDebugInfo(data);
      toast.success('🔍 Diagnosis complete - check results below');
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Diagnosis failed:', error);
      toast.error(`Diagnosis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // MÉTODO 1: Función principal (multi-método automático)
  const tryAutoMethod = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    console.log('🔐 [AUTO] Using automatic multi-method approach');
    
    const { data, error } = await supabase.rpc('admin_change_user_password', {
      target_user_id: targetUserId,
      new_password: newPassword,
      admin_user_id: currentUser.id
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Auto method failed');
    
    return data;
  };

  // MÉTODO 2: Bypass RLS directo
  const tryBypassMethod = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    console.log('🔐 [BYPASS] Using direct RLS bypass method');
    
    const { data, error } = await supabase.rpc('admin_change_user_password_bypass', {
      target_user_id: targetUserId,
      new_password: newPassword,
      admin_user_id: currentUser.id
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Bypass method failed');
    
    return data;
  };

  // MÉTODO 3: Service Role por email
  const tryEmailMethod = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    console.log('🔐 [EMAIL] Using service role email method');
    
    const { data, error } = await supabase.rpc('admin_service_role_password_change', {
      target_user_email: targetUserEmail,
      new_password: newPassword,
      admin_user_id: currentUser.id
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Email method failed');
    
    return data;
  };

  // Función principal que maneja el cambio de contraseña
  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('❌ Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('❌ Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔐 [PASSWORD] Starting password change');
      console.log('🎯 [PASSWORD] Target:', { targetUserId, targetUserEmail });
      console.log('🔧 [PASSWORD] Method:', currentMethod);

      let result = null;
      let methodUsed = '';

      // Seleccionar método según configuración
      if (currentMethod === 'auto') {
        // Método automático que prueba todos
        console.log('🔄 [PASSWORD] Using automatic multi-method');
        toast.loading('🔄 Trying automatic method...', { id: 'password-change' });
        
        result = await tryAutoMethod();
        methodUsed = 'Automatic (Multi-method)';
        
      } else if (currentMethod === 'bypass') {
        // Método de bypass directo
        console.log('🔄 [PASSWORD] Using direct bypass method');
        toast.loading('🔄 Trying RLS bypass...', { id: 'password-change' });
        
        result = await tryBypassMethod();
        methodUsed = 'Direct RLS Bypass';
        
      } else if (currentMethod === 'email') {
        // Método por email
        console.log('🔄 [PASSWORD] Using email method');
        toast.loading('🔄 Trying email method...', { id: 'password-change' });
        
        result = await tryEmailMethod();
        methodUsed = 'Service Role (Email)';
      }

      if (result?.success) {
        toast.success('✅ Password changed successfully!', {
          id: 'password-change',
          description: `Method: ${methodUsed}`,
          duration: 5000
        });
        
        console.log('✅ [PASSWORD] Success details:', result);
        
        setNewPassword('');
        setConfirmPassword('');
        onPasswordChanged();
        
        setTimeout(() => onClose(), 2000);
        
      } else {
        throw new Error(result?.message || 'Password change returned unsuccessful result');
      }

    } catch (error: any) {
      console.error('❌ [PASSWORD] Password change failed:', error);
      
      toast.error('❌ Password change failed', {
        id: 'password-change',
        description: error.message,
        duration: 8000
      });

      // Activar modo debug automáticamente en caso de error
      setDebugMode(true);
      setTimeout(() => debugUser(), 1000);
      
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTemp = () => {
    const tempPassword = generateTempPassword();
    setNewPassword(tempPassword);
    setConfirmPassword(tempPassword);
    setShowPassword(true);
    
    toast.info('🔐 Secure password generated', {
      description: 'Review and confirm the generated password',
      duration: 4000
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Key className="h-5 w-5" />
            Change Password - Super Admin
          </CardTitle>
          
          <div className="space-y-2">
            {/* Target user info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Target User</span>
              </div>
              <p className="text-sm text-blue-700 font-medium">{targetUserEmail}</p>
              <p className="text-xs text-blue-600">{targetUserName}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {targetUserId.slice(0, 8)}...</p>
            </div>
            
            {/* Method selector */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-3 w-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-800">Change Method</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={currentMethod === 'auto' ? 'default' : 'outline'}
                  onClick={() => setCurrentMethod('auto')}
                  className="text-xs h-6"
                >
                  <Zap className="h-2 w-2 mr-1" />
                  Auto
                </Button>
                <Button
                  size="sm"
                  variant={currentMethod === 'bypass' ? 'default' : 'outline'}
                  onClick={() => setCurrentMethod('bypass')}
                  className="text-xs h-6"
                >
                  <Shield className="h-2 w-2 mr-1" />
                  Bypass
                </Button>
                <Button
                  size="sm"
                  variant={currentMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setCurrentMethod('email')}
                  className="text-xs h-6"
                >
                  <Mail className="h-2 w-2 mr-1" />
                  Email
                </Button>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {currentMethod === 'auto' && 'Tries all methods automatically'}
                {currentMethod === 'bypass' && 'Direct RLS bypass for super admins'}
                {currentMethod === 'email' && 'Service role via email lookup'}
              </p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Crown className="h-3 w-3 text-amber-600" />
                <span className="text-xs text-amber-800">
                  <strong>Super Admin Action:</strong> Password will bypass RLS restrictions
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Formulario de contraseña */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
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
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {/* Validation indicators */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {newPassword.length >= 6 ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                )}
                <span className={newPassword.length >= 6 ? 'text-green-600' : 'text-amber-600'}>
                  At least 6 characters
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                {newPassword === confirmPassword && newPassword.length > 0 ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                )}
                <span className={newPassword === confirmPassword && newPassword.length > 0 ? 'text-green-600' : 'text-amber-600'}>
                  Passwords match
                </span>
              </div>
            </div>

            {/* Quick generate button */}
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateTemp}
              className="w-full text-purple-600 hover:text-purple-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Secure Password
            </Button>
          </div>

          {/* Debug section */}
          {debugMode && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Bug className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Debug Mode</span>
                <Badge variant="destructive" className="text-xs">DEV</Badge>
              </div>
              
              <Button 
                onClick={debugUser} 
                disabled={loading}
                variant="outline"
                size="sm"
                className="w-full mb-3"
              >
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Bug className="h-4 w-4 mr-2" />}
                Debug User Lookup
              </Button>

              {debugInfo && (
                <div className="bg-gray-50 rounded p-3 text-xs">
                  <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancel
            </Button>
            
            {!debugMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDebugMode(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Bug className="h-4 w-4 mr-1" />
                Debug
              </Button>
            )}
            
            <Button 
              onClick={handlePasswordChange} 
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
