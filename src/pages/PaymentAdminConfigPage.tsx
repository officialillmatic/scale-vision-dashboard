import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Mail, 
  Briefcase, 
  Check, 
  AlertTriangle, 
  Save,
  Eye,
  EyeOff,
  Settings,
  Users,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

type PaymentMethod = 'stripe' | 'paypal_standard' | 'paypal_business';
type Environment = 'test' | 'production';

interface PaymentConfig {
  id?: string;
  payment_method: PaymentMethod;
  environment: Environment;
  public_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  webhook_endpoint?: string;
  paypal_email?: string;
  client_id?: string;
  client_secret?: string;
  webhook_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const PaymentAdminConfigPage: React.FC = () => {
  const [environment, setEnvironment] = useState<Environment>('test');
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configs, setConfigs] = useState<Record<PaymentMethod, PaymentConfig>>({
    stripe: {
      payment_method: 'stripe',
      environment: 'test',
      public_key: '',
      secret_key: '',
      webhook_secret: '',
      webhook_endpoint: '',
      is_active: false
    },
    paypal_standard: {
      payment_method: 'paypal_standard',
      environment: 'test',
      paypal_email: '',
      is_active: false
    },
    paypal_business: {
      payment_method: 'paypal_business',
      environment: 'test',
      client_id: '',
      client_secret: '',
      webhook_url: '',
      is_active: false
    }
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [currentActiveMethod, setCurrentActiveMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, [environment]);

  const loadConfigurations = async () => {
    setLoading(true);
    try {
      // Cargar todas las configuraciones para el environment actual
      const { data, error } = await supabase
        .from('payment_configurations')
        .select('*')
        .eq('environment', environment);

      if (error) {
        throw error;
      }

      // Resetear configs
      const newConfigs = { ...configs };
      let activeMethod: PaymentMethod | null = null;

      // Actualizar con datos de la base de datos
      data?.forEach((config) => {
        const method = config.payment_method as PaymentMethod;
        newConfigs[method] = {
          ...newConfigs[method],
          ...config,
          environment
        };
        
        if (config.is_active) {
          activeMethod = method;
        }
      });

      setConfigs(newConfigs);
      setCurrentActiveMethod(activeMethod);
      
      if (activeMethod) {
        setActiveMethod(activeMethod);
      }
      
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      setMessage({ type: 'error', text: `Error loading configurations: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (method: PaymentMethod) => {
    setSaving(true);
    setMessage(null);
    
    try {
      const config = configs[method];
      
      // Validar campos requeridos
      const isValid = validateConfig(config);
      if (!isValid) {
        throw new Error('Please fill in all required fields');
      }

      // Si este método se está activando, desactivar otros
      if (config.is_active) {
        await supabase
          .from('payment_configurations')
          .update({ is_active: false })
          .eq('environment', environment)
          .neq('payment_method', method);
      }

      // Preparar datos específicos del método de pago
      let upsertData: any = {
        payment_method: method,
        environment,
        is_active: config.is_active,
        updated_at: new Date().toISOString()
      };

      // Añadir solo los campos necesarios según el método
      switch (method) {
        case 'stripe':
          upsertData = {
            ...upsertData,
            public_key: config.public_key,
            secret_key: config.secret_key,
            webhook_secret: config.webhook_secret || null,
            webhook_endpoint: config.webhook_endpoint || null
          };
          break;
        case 'paypal_standard':
          upsertData = {
            ...upsertData,
            paypal_email: config.paypal_email
          };
          break;
        case 'paypal_business':
          upsertData = {
            ...upsertData,
            client_id: config.client_id,
            client_secret: config.client_secret,
            webhook_url: config.webhook_url || null
          };
          break;
      }

      // Guardar o actualizar configuración
      const { data, error } = await supabase
        .from('payment_configurations')
        .upsert(upsertData, {
          onConflict: 'payment_method,environment'
        });

      if (error) {
        throw error;
      }

      setMessage({ 
        type: 'success', 
        text: `${method.replace('_', ' ').toUpperCase()} configuration saved successfully! ${config.is_active ? 'This is now the default payment method for users.' : ''}` 
      });
      
      // Recargar configuraciones
      await loadConfigurations();
      
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const validateConfig = (config: PaymentConfig): boolean => {
    switch (config.payment_method) {
      case 'stripe':
        return !!(config.public_key && config.secret_key);
      case 'paypal_standard':
        return !!config.paypal_email;
      case 'paypal_business':
        return !!(config.client_id && config.client_secret);
      default:
        return false;
    }
  };

  const updateConfig = (method: PaymentMethod, field: string, value: string | boolean) => {
    setConfigs(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: value
      }
    }));
  };

  const toggleSecret = (fieldName: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'stripe':
        return <CreditCard className="h-5 w-5" />;
      case 'paypal_standard':
        return <Mail className="h-5 w-5" />;
      case 'paypal_business':
        return <Briefcase className="h-5 w-5" />;
    }
  };

  const getMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case 'stripe':
        return 'blue';
      case 'paypal_standard':
        return 'yellow';
      case 'paypal_business':
        return 'green';
    }
  };

  const isMethodActive = (method: PaymentMethod) => {
    return currentActiveMethod === method;
  };

  const getMethodDisplayName = (method: PaymentMethod) => {
    switch (method) {
      case 'stripe':
        return 'Credit/Debit Cards (Stripe)';
      case 'paypal_standard':
        return 'PayPal Standard';
      case 'paypal_business':
        return 'PayPal Business';
      default:
        return method;
    }
  };

  const renderSecretField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    fieldName: string,
    placeholder: string,
    required: boolean = true
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      <div className="relative">
        <Input
          type={showSecrets[fieldName] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => toggleSecret(fieldName)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showSecrets[fieldName] ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Payment Configuration
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Configure the default payment method for all users. Only one method can be active per environment.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Environment Selector and Active Method Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label className="text-lg font-semibold">Environment:</Label>
                <Select value={environment} onValueChange={(value: Environment) => setEnvironment(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Active Method Indicator */}
              <div className="flex items-center gap-4">
                {currentActiveMethod ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Users will pay with:</span>
                    <Badge 
                      variant="outline" 
                      className={`text-${getMethodColor(currentActiveMethod)}-700 border-${getMethodColor(currentActiveMethod)}-200 bg-${getMethodColor(currentActiveMethod)}-50`}
                    >
                      <div className="flex items-center gap-1">
                        {getMethodIcon(currentActiveMethod)}
                        {getMethodDisplayName(currentActiveMethod)}
                        <Check className="h-3 w-3" />
                      </div>
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-700">No payment method configured</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* User Impact Info */}
        {currentActiveMethod && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">User Experience Impact</h4>
                  <p className="text-sm text-blue-800">
                    When users select a plan, they will be automatically redirected to pay using{' '}
                    <strong>{getMethodDisplayName(currentActiveMethod)}</strong>. 
                    They won't be able to choose a different payment method.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertTriangle className={`h-4 w-4 ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`} />
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Methods Tabs */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">Loading configurations...</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeMethod} onValueChange={(value) => setActiveMethod(value as PaymentMethod)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="stripe" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Stripe
                {isMethodActive('stripe') && <Check className="h-3 w-3 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="paypal_standard" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                PayPal Standard
                {isMethodActive('paypal_standard') && <Check className="h-3 w-3 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="paypal_business" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                PayPal Business
                {isMethodActive('paypal_business') && <Check className="h-3 w-3 text-green-600" />}
              </TabsTrigger>
            </TabsList>

            {/* Stripe Configuration */}
            <TabsContent value="stripe">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Stripe Configuration
                  </CardTitle>
                  <p className="text-gray-600 text-sm">
                    Configure your Stripe payment gateway with API keys. Users will pay with credit/debit cards.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Publishable Key</Label>
                      <span className="text-red-500 text-xs">*</span>
                      <Input
                        type="text"
                        value={configs.stripe.public_key || ''}
                        onChange={(e) => updateConfig('stripe', 'public_key', e.target.value)}
                        placeholder="pk_test_..."
                      />
                    </div>

                    {renderSecretField(
                      'Secret Key',
                      configs.stripe.secret_key || '',
                      (value) => updateConfig('stripe', 'secret_key', value),
                      'stripe_secret',
                      'sk_test_...'
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderSecretField(
                      'Webhook Secret',
                      configs.stripe.webhook_secret || '',
                      (value) => updateConfig('stripe', 'webhook_secret', value),
                      'stripe_webhook_secret',
                      'whsec_...',
                      false
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Webhook Endpoint</Label>
                      <Input
                        type="url"
                        value={configs.stripe.webhook_endpoint || ''}
                        onChange={(e) => updateConfig('stripe', 'webhook_endpoint', e.target.value)}
                        placeholder="https://your-domain.com/webhooks/stripe"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="stripe-active"
                        checked={configs.stripe.is_active}
                        onChange={(e) => updateConfig('stripe', 'is_active', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="stripe-active" className="text-sm font-medium">
                        Set as default payment method for {environment}
                      </Label>
                    </div>

                    <Button 
                      onClick={() => handleSave('stripe')}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Stripe Config
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PayPal Standard Configuration */}
            <TabsContent value="paypal_standard">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-yellow-600" />
                    PayPal Standard Configuration
                  </CardTitle>
                  <p className="text-gray-600 text-sm">
                    Simple PayPal integration using your PayPal account email (no API required). Users will be redirected to PayPal.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">PayPal Account Email</Label>
                    <span className="text-red-500 text-xs">*</span>
                    <Input
                      type="email"
                      value={configs.paypal_standard.paypal_email || ''}
                      onChange={(e) => updateConfig('paypal_standard', 'paypal_email', e.target.value)}
                      placeholder="your-paypal@email.com"
                    />
                    <p className="text-xs text-gray-500">
                      This is the email associated with your PayPal account that will receive payments
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="paypal-standard-active"
                        checked={configs.paypal_standard.is_active}
                        onChange={(e) => updateConfig('paypal_standard', 'is_active', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="paypal-standard-active" className="text-sm font-medium">
                        Set as default payment method for {environment}
                      </Label>
                    </div>

                    <Button 
                      onClick={() => handleSave('paypal_standard')}
                      disabled={saving}
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save PayPal Standard
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PayPal Business Configuration */}
            <TabsContent value="paypal_business">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600" />
                    PayPal Business Configuration
                  </CardTitle>
                  <p className="text-gray-600 text-sm">
                    Advanced PayPal integration with API credentials for business accounts. Better for professional use.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Client ID</Label>
                      <span className="text-red-500 text-xs">*</span>
                      <Input
                        type="text"
                        value={configs.paypal_business.client_id || ''}
                        onChange={(e) => updateConfig('paypal_business', 'client_id', e.target.value)}
                        placeholder="PayPal Client ID"
                      />
                    </div>

                    {renderSecretField(
                      'Client Secret',
                      configs.paypal_business.client_secret || '',
                      (value) => updateConfig('paypal_business', 'client_secret', value),
                      'paypal_client_secret',
                      'PayPal Client Secret'
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Webhook URL</Label>
                    <Input
                      type="url"
                      value={configs.paypal_business.webhook_url || ''}
                      onChange={(e) => updateConfig('paypal_business', 'webhook_url', e.target.value)}
                      placeholder="https://your-domain.com/webhooks/paypal"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="paypal-business-active"
                        checked={configs.paypal_business.is_active}
                        onChange={(e) => updateConfig('paypal_business', 'is_active', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="paypal-business-active" className="text-sm font-medium">
                        Set as default payment method for {environment}
                      </Label>
                    </div>

                    <Button 
                      onClick={() => handleSave('paypal_business')}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save PayPal Business
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Important Notes:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Only one payment method can be active per environment</strong> at a time</li>
                  <li>• Users will automatically use the active payment method - they cannot choose a different one</li>
                  <li>• Test environment uses sandbox/test credentials</li>
                  <li>• Production environment uses live credentials</li>
                  <li>• PayPal Standard requires no API setup - just your PayPal email</li>
                  <li>• PayPal Business requires API credentials from PayPal Developer Console</li>
                  <li>• Always test in the test environment before going live</li>
                  <li>• Changes take effect immediately for new subscriptions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default PaymentAdminConfigPage;
