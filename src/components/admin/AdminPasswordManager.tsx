// src/components/admin/AdminPasswordManager.tsx - PARTE 1

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
// src/components/admin/AdminPasswordManager.tsx - PARTE 2

export const AdminPasswordManager: React.FC<AdminPasswordManagerProps> = ({
  targetUserId,
  targetUserEmail,
  targetUserName,
  onPasswordChanged,
  onClose,
}) => {
  // Estados del componente
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [currentMethod, setCurrentMethod] = useState<'primary' | 'email' | 'api'>('primary');

  // Función para generar contraseña segura
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    
    // Asegurar al menos: 1 mayúscula, 1 minúscula, 1 número, 1 especial
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];
    
    // Completar hasta 12 caracteres
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Mezclar caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };
  // src/components/admin/AdminPasswordManager.tsx - PARTE 3

  // Función de diagnóstico mejorada
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
  // src/components/admin/AdminPasswordManager.tsx - PARTE 4

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
  // src/components/admin/AdminPasswordManager.tsx - PARTE 5

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
            // Último método también falló
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

      // Activar modo debug automáticamente
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
