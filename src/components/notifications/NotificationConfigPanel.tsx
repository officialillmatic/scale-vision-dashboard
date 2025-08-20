import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Mail, 
  Bell, 
  Settings, 
  Save, 
  TestTube,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Send
} from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface NotificationConfig {
  id?: string;
  notification_email: string;
  warning_threshold: number;
  critical_threshold: number;
  zero_balance_threshold: number;
  email_enabled: boolean;
  dashboard_alerts_enabled: boolean;
  notification_frequency_hours: number;
}

interface LowBalanceUser {
  user_id: string;
  user_email: string;
  user_name: string;
  current_balance: number;
  alert_level: string;
  hours_since_last_notification: number;
}

export const NotificationConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<NotificationConfig>({
    notification_email: '',
    warning_threshold: 10.00,
    critical_threshold: 5.00,
    zero_balance_threshold: 1.00,
    email_enabled: true,
    dashboard_alerts_enabled: true,
    notification_frequency_hours: 24
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lowBalanceUsers, setLowBalanceUsers] = useState<LowBalanceUser[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // 🔄 Cargar configuración existente
  useEffect(() => {
    loadConfiguration();
    checkLowBalanceUsers();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(checkLowBalanceUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications_config')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // No encontrado
        throw error;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error: any) {
      console.error('Error loading notification config:', error);
      toast.error(`Error cargando configuración: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLowBalanceUsers = async () => {
    try {
      console.log('🔍 Checking for low balance users...');
      
      const { data, error } = await supabase
        .rpc('get_users_needing_notification');

      if (error) {
        throw error;
      }

      setLowBalanceUsers(data || []);
      setLastCheck(new Date());
      
      console.log(`📊 Found ${data?.length || 0} users with low balance`);
      
    } catch (error: any) {
      console.error('Error checking low balance users:', error);
      // No mostrar toast error aquí para evitar spam
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    
    try {
      console.log('💾 Saving notification configuration...');
      
      const { data, error } = await supabase
        .from('admin_notifications_config')
        .upsert({
          ...config,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setConfig(data);
      toast.success('✅ Configuración guardada exitosamente');
      
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast.error(`❌ Error guardando configuración: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (!config.notification_email) {
      toast.error('Por favor configura un email primero');
      return;
    }

    setTesting(true);
    
    try {
      console.log('🧪 Sending test notification...');
      
      // Simular envío de notificación de prueba
      const testResult = await supabase.rpc('send_low_balance_notifications');
      
      if (testResult.error) {
        throw testResult.error;
      }

      toast.success(`✅ Notificación de prueba enviada a ${config.notification_email}`);
      
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error(`❌ Error enviando notificación: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'zero': return 'destructive';
      case 'almost_zero': return 'destructive';
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'zero': return <AlertTriangle className="w-4 h-4" />;
      case 'almost_zero': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <Bell className="w-4 h-4" />;
      default: return <Check className="w-4 h-4" />;
    }
  };

  const getAlertLabel = (level: string) => {
    switch (level) {
      case 'zero': return 'BALANCE CERO';
      case 'almost_zero': return 'CASI CERO';
      case 'critical': return 'CRÍTICO';
      case 'warning': return 'ADVERTENCIA';
      default: return 'NORMAL';
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-3">Cargando configuración de notificaciones...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 🚨 ALERTAS DE USUARIOS CON BALANCE BAJO */}
      {lowBalanceUsers.length > 0 && (
        <Card className="border-red-200 bg-red-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              ⚠️ ALERTA: Usuarios con Balance Bajo
              <Badge variant="destructive" className="ml-auto">
                {lowBalanceUsers.length} usuarios
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {lowBalanceUsers.map((user) => (
                <div 
                  key={user.user_id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      {getAlertIcon(user.alert_level)}
                    </div>
                    
                    <div>
                      <p className="font-semibold text-gray-900">{user.user_name}</p>
                      <p className="text-sm text-gray-600">{user.user_email}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          ${user.current_balance.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {user.hours_since_last_notification < 999 
                            ? `Notificado hace ${user.hours_since_last_notification}h`
                            : 'Sin notificar'
                          }
                        </p>
                      </div>
                      
                      <Badge variant={getAlertColor(user.alert_level) as any}>
                        {getAlertLabel(user.alert_level)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-red-200 flex items-center justify-between">
              <p className="text-sm text-red-700">
                Última verificación: {lastCheck?.toLocaleTimeString() || 'Nunca'}
              </p>
              <Button
                onClick={checkLowBalanceUsers}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ⚙️ CONFIGURACIÓN DE NOTIFICACIONES */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            Configuración de Notificaciones
          </CardTitle>
          <p className="text-gray-600">
            Configure alertas automáticas para usuarios con balance bajo
          </p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          
          {/* Email de Notificaciones */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              📧 Email para Notificaciones
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="email"
                  value={config.notification_email}
                  onChange={(e) => setConfig(prev => ({ ...prev, notification_email: e.target.value }))}
                  placeholder="admin@drscaleai.com"
                  className="pl-10"
                />
              </div>
              <Button
                onClick={sendTestNotification}
                disabled={testing || !config.notification_email}
                variant="outline"
                className="px-4"
              >
                {testing ? <LoadingSpinner size="sm" /> : <TestTube className="w-4 h-4" />}
                {testing ? 'Enviando...' : 'Prueba'}
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Este email recibirá todas las notificaciones de balance bajo
            </p>
          </div>

          {/* Umbrales de Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-yellow-700">
                ⚠️ Umbral de Advertencia
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={config.warning_threshold}
                onChange={(e) => setConfig(prev => ({ ...prev, warning_threshold: parseFloat(e.target.value) || 0 }))}
                className="border-yellow-300"
              />
              <p className="text-xs text-gray-600">Notificar cuando el balance baje de este monto</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-red-700">
                🚨 Umbral Crítico
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={config.critical_threshold}
                onChange={(e) => setConfig(prev => ({ ...prev, critical_threshold: parseFloat(e.target.value) || 0 }))}
                className="border-red-300"
              />
              <p className="text-xs text-gray-600">Balance crítico que requiere acción inmediata</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                💀 Casi Cero
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={config.zero_balance_threshold}
                onChange={(e) => setConfig(prev => ({ ...prev, zero_balance_threshold: parseFloat(e.target.value) || 0 }))}
                className="border-gray-300"
              />
              <p className="text-xs text-gray-600">Considerar "casi cero" cuando baje de este monto</p>
            </div>
          </div>

          {/* Frecuencia de Notificaciones */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              ⏰ Frecuencia de Notificaciones
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Cada</span>
              <Input
                type="number"
                min="1"
                max="168"
                value={config.notification_frequency_hours}
                onChange={(e) => setConfig(prev => ({ ...prev, notification_frequency_hours: parseInt(e.target.value) || 24 }))}
                className="w-20"
              />
              <span className="text-sm text-gray-600">horas</span>
            </div>
            <p className="text-xs text-gray-600">
              Evita spam enviando la misma notificación solo después de este período
            </p>
          </div>

          {/* Switches de Habilitación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">Notificaciones por Email</span>
                </div>
                <p className="text-sm text-gray-600">Enviar alertas al email configurado</p>
              </div>
              <Switch
                checked={config.email_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, email_enabled: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold">Alertas en Dashboard</span>
                </div>
                <p className="text-sm text-gray-600">Mostrar alertas en el panel de admin</p>
              </div>
              <Switch
                checked={config.dashboard_alerts_enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, dashboard_alerts_enabled: checked }))}
              />
            </div>
          </div>

          {/* Botón de Guardar */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={saveConfiguration}
              disabled={saving}
              className="px-6"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              <span className="ml-2">
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </span>
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* 📊 ESTADÍSTICAS DE NOTIFICACIONES */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            Estadísticas de Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{lowBalanceUsers.length}</p>
              <p className="text-sm text-gray-600">Usuarios Alertados</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {lowBalanceUsers.filter(u => u.alert_level === 'zero' || u.alert_level === 'almost_zero').length}
              </p>
              <p className="text-sm text-gray-600">Balance Cero/Casi Cero</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {lowBalanceUsers.filter(u => u.alert_level === 'critical').length}
              </p>
              <p className="text-sm text-gray-600">Balance Crítico</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {config.email_enabled ? 'Activo' : 'Inactivo'}
              </p>
              <p className="text-sm text-gray-600">Estado del Sistema</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
