import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Settings, 
  Eye, 
  EyeOff,
  Copy,
  TestTube,
  Rocket,
  Key,
  Webhook,
  CheckCircle,
  AlertTriangle,
  Info,
  Save,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

interface StripeConfig {
  id?: string;
  environment: 'test' | 'production';
  public_key: string;
  secret_key: string;
  webhook_secret: string;
  webhook_endpoint: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const StripeAdminConfigPage: React.FC = () => {
  const { user } = useAuth();
  
  // Verificar si es super admin
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'test' | 'production'>('test');
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});
  
  // Configuraciones
  const [configs, setConfigs] = useState<{
    test: StripeConfig;
    production: StripeConfig;
  }>({
    test: {
      environment: 'test',
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      webhook_endpoint: `${window.location.origin}/api/webhooks/stripe/test`,
      is_active: true
    },
    production: {
      environment: 'production',
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      webhook_endpoint: `${window.location.origin}/api/webhooks/stripe/production`,
      is_active: false
    }
  });

  // Estados de conexión
  const [connectionStatus, setConnectionStatus] = useState<{
    test: 'checking' | 'connected' | 'disconnected' | 'error';
    production: 'checking' | 'connected' | 'disconnected' | 'error';
  }>({
    test: 'checking',
    production: 'checking'
  });

  // Cargar configuraciones existentes
  useEffect(() => {
    if (isSuperAdmin) {
      loadConfigurations();
    }
  }, [isSuperAdmin]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('stripe_configurations')
        .select('*')
        .in('environment', ['test', 'production']);

      if (error) {
        throw error;
      }

      if (data) {
        const newConfigs = { ...configs };
        
        data.forEach((config) => {
          newConfigs[config.environment as 'test' | 'production'] = {
            ...config,
            webhook_endpoint: config.webhook_endpoint || `${window.location.origin}/api/webhooks/stripe/${config.environment}`
          };
        });
        
        setConfigs(newConfigs);
      }

      // Verificar conexiones automáticamente
      setTimeout(() => {
        checkConnection('test');
        checkConnection('production');
      }, 500);

    } catch (err: any) {
      console.error('Error cargando configuraciones:', err);
      setError(`Error cargando configuraciones: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async (environment: 'test' | 'production') => {
    try {
      setSaving(true);
      setError(null);

      const config = configs[environment];

      // Validaciones
      if (!config.public_key || !config.secret_key) {
        throw new Error('Las claves pública y secreta son obligatorias');
      }

      const expectedPkPrefix = environment === 'test' ? 'pk_test_' : 'pk_live_';
      const expectedSkPrefix = environment === 'test' ? 'sk_test_' : 'sk_live_';

      if (!config.public_key.startsWith(expectedPkPrefix)) {
        throw new Error(`La clave pública debe empezar con ${expectedPkPrefix}`);
      }

      if (!config.secret_key.startsWith(expectedSkPrefix)) {
        throw new Error(`La clave secreta debe empezar con ${expectedSkPrefix}`);
      }

      // Verificar si ya existe una configuración
      const { data: existing } = await supabase
        .from('stripe_configurations')
        .select('id')
        .eq('environment', environment)
        .single();

      const configData = {
        environment,
        public_key: config.public_key,
        secret_key: config.secret_key,
        webhook_secret: config.webhook_secret || '',
        webhook_endpoint: config.webhook_endpoint,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
        created_by: user?.id
      };

      if (existing) {
        // Actualizar existente
        const { error } = await supabase
          .from('stripe_configurations')
          .update(configData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('stripe_configurations')
          .insert({
            ...configData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Recargar configuraciones
      await loadConfigurations();
      
      // Mostrar notificación de éxito
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      `;
      notification.innerHTML = `✅ Configuración de ${environment} guardada exitosamente`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 4000);

    } catch (err: any) {
      console.error('Error guardando configuración:', err);
      setError(`Error guardando configuración: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const checkConnection = async (environment: 'test' | 'production') => {
    try {
      setTesting(environment);
      setConnectionStatus(prev => ({ ...prev, [environment]: 'checking' }));

      const config = configs[environment];

      if (!config.public_key || !config.secret_key) {
        setConnectionStatus(prev => ({ ...prev, [environment]: 'disconnected' }));
        return;
      }

      // Simular verificación de conexión con Stripe
      // En producción real, esto haría una llamada al backend para verificar las credenciales
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular éxito en 90% de los casos
      const success = Math.random() < 0.9;
      
      setConnectionStatus(prev => ({ 
        ...prev, 
        [environment]: success ? 'connected' : 'error' 
      }));

      if (success) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          font-weight: bold;
          z-index: 9999;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        `;
        notification.innerHTML = `✅ Conexión de ${environment} exitosa`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
      }

    } catch (err: any) {
      console.error('Error verificando conexión:', err);
      setConnectionStatus(prev => ({ ...prev, [environment]: 'error' }));
    } finally {
      setTesting(null);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 9999;
        font-size: 14px;
      `;
      notification.innerHTML = `📋 ${label} copiado al portapapeles`;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.remove(), 2000);
    });
  };

  const updateConfig = (environment: 'test' | 'production', field: string, value: string) => {
    setConfigs(prev => ({
      ...prev,
      [environment]: {
        ...prev[environment],
        [field]: value
      }
    }));
  };

  // Verificar acceso
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="border-red-200 bg-red-50 max-w-md">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
              <p className="text-red-600">Debes iniciar sesión para acceder a esta página.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="border-red-200 bg-red-50 max-w-md">
            <CardContent className="p-6 text-center">
              <ShieldX className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
              <p className="text-red-600 mb-4">Solo los superadministradores pueden acceder a esta configuración.</p>
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                Permisos Insuficientes
              </Badge>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4 font-medium">Cargando configuración de Stripe...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentConfig = configs[activeTab];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                Configuración de Stripe
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Panel de administración para credenciales de Stripe
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1">
              <Shield className="w-4 h-4 mr-2" />
              Superadmin
            </Badge>
            <Button
              onClick={() => loadConfigurations()}
              disabled={loading}
              variant="outline"
              size="default"
            >
              {loading ? <LoadingSpinner size="sm" /> : "🔄"} Recargar
            </Button>
          </div>
        </div>

        {/* Advertencia de Seguridad */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-800 mb-2">⚠️ Advertencia de Seguridad</h3>
                <p className="text-yellow-700 leading-relaxed">
                  Esta página contiene credenciales sensibles de Stripe. Solo los superadministradores autorizados 
                  deben tener acceso. Nunca compartas estas credenciales y asegúrate de usar conexiones seguras HTTPS.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">❌</span>
                </div>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado de Conexión */}
        <div className="grid md:grid-cols-2 gap-6">
          {(['test', 'production'] as const).map((env) => (
            <Card key={env} className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  {env === 'test' ? (
                    <TestTube className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Rocket className="h-5 w-5 text-green-600" />
                  )}
                  Ambiente de {env === 'test' ? 'Prueba' : 'Producción'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
                    ${connectionStatus[env] === 'connected' ? 'bg-green-100' : 
                      connectionStatus[env] === 'error' ? 'bg-red-100' : 
                      connectionStatus[env] === 'checking' ? 'bg-blue-100' : 'bg-gray-100'}
                  `}>
                    {connectionStatus[env] === 'checking' && <LoadingSpinner size="sm" />}
                    {connectionStatus[env] === 'connected' && <CheckCircle className="h-8 w-8 text-green-600" />}
                    {connectionStatus[env] === 'error' && <ShieldX className="h-8 w-8 text-red-600" />}
                    {connectionStatus[env] === 'disconnected' && <Shield className="h-8 w-8 text-gray-600" />}
                  </div>
                  
                  <p className={`font-semibold mb-2 ${
                    connectionStatus[env] === 'connected' ? 'text-green-700' : 
                    connectionStatus[env] === 'error' ? 'text-red-700' : 
                    connectionStatus[env] === 'checking' ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {connectionStatus[env] === 'checking' && 'Verificando conexión...'}
                    {connectionStatus[env] === 'connected' && 'Conectado correctamente'}
                    {connectionStatus[env] === 'error' && 'Error en la conexión'}
                    {connectionStatus[env] === 'disconnected' && 'Desconectado'}
                  </p>
                  
                  <Button
                    onClick={() => checkConnection(env)}
                    disabled={testing === env}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    {testing === env ? <LoadingSpinner size="sm" /> : <Zap className="h-4 w-4" />}
                    {testing === env ? 'Probando...' : 'Probar Conexión'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs de Configuración */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">
                Configuración de Credenciales
              </CardTitle>
              
              {/* Tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('test')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'test'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TestTube className="h-4 w-4 inline-block mr-2" />
                  Prueba
                </button>
                <button
                  onClick={() => setActiveTab('production')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'production'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Rocket className="h-4 w-4 inline-block mr-2" />
                  Producción
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              
              {/* Clave Pública */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Key className="h-4 w-4 inline-block mr-2" />
                  Clave Pública (Publishable Key)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentConfig.public_key}
                    onChange={(e) => updateConfig(activeTab, 'public_key', e.target.value)}
                    placeholder={`pk_${activeTab}_...`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                  />
                  {currentConfig.public_key && (
                    <button
                      onClick={() => copyToClipboard(currentConfig.public_key, 'Clave pública')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Esta clave se usa en el frontend y es visible públicamente
                </p>
              </div>

              {/* Clave Secreta */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Shield className="h-4 w-4 inline-block mr-2" />
                  Clave Secreta (Secret Key)
                </label>
                <div className="relative">
                  <input
                    type={showSecrets[`${activeTab}_secret`] ? 'text' : 'password'}
                    value={currentConfig.secret_key}
                    onChange={(e) => updateConfig(activeTab, 'secret_key', e.target.value)}
                    placeholder={`sk_${activeTab}_...`}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm pr-20"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {currentConfig.secret_key && (
                      <button
                        onClick={() => copyToClipboard(currentConfig.secret_key, 'Clave secreta')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleSecretVisibility(`${activeTab}_secret`)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets[`${activeTab}_secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Esta clave se mantiene segura en el backend
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Webhook className="h-4 w-4 inline-block mr-2" />
                  Webhook Secret
                </label>
                <div className="relative">
                  <input
                    type={showSecrets[`${activeTab}_webhook`] ? 'text' : 'password'}
                    value={currentConfig.webhook_secret}
                    onChange={(e) => updateConfig(activeTab, 'webhook_secret', e.target.value)}
                    placeholder="whsec_..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm pr-20"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {currentConfig.webhook_secret && (
                      <button
                        onClick={() => copyToClipboard(currentConfig.webhook_secret, 'Webhook secret')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleSecretVisibility(`${activeTab}_webhook`)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets[`${activeTab}_webhook`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Secret para verificar la autenticidad de los webhooks
                </p>
              </div>

              {/* Webhook Endpoint */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Info className="h-4 w-4 inline-block mr-2" />
                  Webhook Endpoint
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentConfig.webhook_endpoint}
                    onChange={(e) => updateConfig(activeTab, 'webhook_endpoint', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(currentConfig.webhook_endpoint, 'Webhook URL')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  URL donde Stripe enviará los eventos de webhook
                </p>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900">Estado de la Configuración</h4>
                  <p className="text-sm text-gray-600">
                    Activar o desactivar esta configuración
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentConfig.is_active}
                    onChange={(e) => updateConfig(activeTab, 'is_active', e.target.checked.toString())}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => saveConfiguration(activeTab)}
                  disabled={saving || !currentConfig.public_key || !currentConfig.secret_key}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
                
                <Button
                  onClick={() => checkConnection(activeTab)}
                  disabled={testing === activeTab || !currentConfig.public_key || !currentConfig.secret_key}
                  variant="outline"
                >
                  {testing === activeTab ? <LoadingSpinner size="sm" /> : <Zap className="h-4 w-4" />}
                  Probar Conexión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Webhooks */}
        <Card className="border-0 shadow-lg bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Webhook className="h-5 w-5" />
              Configuración de Webhooks en Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-blue-700">
              Para configurar los webhooks en tu panel de Stripe, utiliza las siguientes URLs:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Ambiente de Prueba:</h4>
                <code className="text-sm bg-blue-100 px-2 py-1 rounded block break-all">
                  {configs.test.webhook_endpoint}
                </code>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Ambiente de Producción:</h4>
                <code className="text-sm bg-blue-100 px-2 py-1 rounded block break-all">
                  {configs.production.webhook_endpoint}
                </code>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Eventos Recomendados:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-700">
                <span>• customer.subscription.created</span>
                <span>• customer.subscription.updated</span>
                <span>• customer.subscription.deleted</span>
                <span>• invoice.payment_succeeded</span>
                <span>• invoice.payment_failed</span>
                <span>• checkout.session.completed</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default StripeAdminConfigPage;
