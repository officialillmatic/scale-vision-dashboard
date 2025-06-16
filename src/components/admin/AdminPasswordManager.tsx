// src/components/admin/AdminPasswordManager.tsx

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
  const [currentMethod, setCurrentMethod] = useState<'primary' | 'email' | 'api'>('primary');

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

  // MÉTODO 1: Función principal con múltiples intentos
  const tryPrimaryMethod = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    console.log('🔐 [METHOD 1] Using primary method with multiple attempts');
    
    const { data, error } = await supabase.rpc('admin_change_user_password', {
      target_user_id: targetUserId,
      new_password: newPassword,
      admin_user_id: currentUser.id
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Primary method failed');
    
    return data;
  };

  // MÉTODO 2: Por email como fallback
  const tryEmailMethod = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    console.log('🔐 [METHOD 2] Using email-based method');
    
    const { data, error } = await supabase.rpc('admin_force_password_reset', {
      target_user_email: targetUserEmail,
      new_password: newPassword,
      admin_user_id: currentUser.id
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'Email method failed');
    
    return data;
  };

  // MÉTODO 3: API de Supabase
  const tryApiMethod = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    console.log('🔐 [METHOD 3] Using Supabase API method');
    
    const { data, error } = await supabase.rpc('admin_update_user_auth', {
      target_user_id: targetUserId,
      new_password: newPassword,
      admin_user_id: currentUser.id
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || 'API method failed');
    
    return data;
  };

  // Función principal que prueba todos los métodos
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
      console.log('🔐 [PASSWORD] Starting multi-method password change');
      console.log('🎯 [PASSWORD] Target:', { targetUserId, targetUserEmail });

      let result = null;
      let methodUsed = '';

      // Intentar métodos en orden según la selección del usuario
      const methods = currentMethod === 'primary' 
        ? [tryPrimaryMethod, tryEmailMethod, tryApiMethod]
        : currentMethod === 'email'
        ? [tryEmailMethod, tryPrimaryMethod, tryApiMethod]
        : [tryApiMethod, tryPrimaryMethod, tryEmailMethod];

      const methodNames = currentMethod === 'primary'
        ? ['Primary (Multi-attempt)', 'Email-based', 'API-based']
        : currentMethod === 'email'
        ? ['Email-based', 'Primary (Multi-attempt)', 'API-based']
        : ['API-based', 'Primary (Multi-attempt)', 'Email-based'];

      for (let i = 0; i < methods.length; i++) {
        try {
          console.log(`🔄 [PASSWORD] Trying method ${i + 1}: ${methodNames[i]}`);
          toast.loading(`🔄 Trying ${methodNames[i]}...`, { id: 'password-change' });
          
          result = await methods[i]();
          methodUsed = methodNames[i];
          
          console.log(`✅ [PASSWORD] Method ${i + 1} successful:`, result);
          break;
          
        } catch (error: any) {
          console.log(`❌ [PASSWORD] Method ${i + 1} failed:`, error.message);
          
          if (i === methods.length - 1) {
            throw new Error(`All methods failed. Last error: ${error.message}`);
          }
        }
      }

      if (result?.success) {
        toast.success('✅ Password changed successfully!', {
          id: 'password-change',
          description: `Method used: ${methodUsed}`,
          duration: 5000
        });
        
        console.log('✅ [PASSWORD] Success details:', result);
        
        setNewPassword('');
        setConfirmPassword('');
        onPasswordChanged();
        
        setTimeout(() => onClose(), 2000);
        
      } else {
        throw new Error('Password change returned unsuccessful result');
      }

    } catch (error: any) {
      console.error('❌ [PASSWORD] All methods failed:', error);
      
      toast.error('❌ Password change failed', {
        id: 'password-change',
        description: error.message,
        duration: 8000
      });

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
            Change Password - Multi-Method
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
                <span className="text-xs font-medium text-purple-800">Primary Method</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={currentMethod === 'primary' ? 'default' : 'outline'}
                  onClick={() => setCurrentMethod('primary')}
                  className="text-xs h-6"
                >
                  <Zap className="h-2 w-2 mr-1" />
                  Multi-attempt
                </Button>
                <Button
                  size="sm"
                  variant={currentMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setCurrentMethod('email')}
                  className="text-xs h-6"
                >
                  <Mail className="h-2 w-2 mr-1" />
                  Email-based
                </Button>
                <Button
                  size="sm"
                  variant={currentMethod === 'api' ? 'default' : 'outline'}
                  onClick={() => setCurrentMethod('api')}
                  className="text-xs h-6"
                >
                  <Crown className="h-2 w-2 mr-1" />
                  API
                </Button>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-amber-600" />
                <span className="text-xs text-amber-800">
                  <strong>Super Admin Action:</strong> Password will be changed immediately
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
