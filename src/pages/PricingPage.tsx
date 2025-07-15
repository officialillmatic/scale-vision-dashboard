import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Star, 
  Zap, 
  Crown, 
  MessageCircle, 
  Mail,
  Phone,
  Clock,
  Users,
  BarChart3,
  Settings,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';

// Stripe configuration (these should be loaded from your Supabase stripe_configurations table)
const STRIPE_CONFIG = {
  publicKey: 'pk_test_...' // This will be loaded from Supabase
};

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number | 'custom';
  period: string;
  description: string;
  features: PlanFeature[];
  popular: boolean;
  stripePriceId?: string;
  gradient: string;
  icon: React.ReactNode;
  buttonText: string;
  buttonVariant: 'default' | 'outline';
}

const plans: Plan[] = [
  {
    id: 'essential',
    name: 'Essential Support',
    price: 800,
    period: 'month',
    description: 'Perfect for small teams getting started with AI voice agents',
    stripePriceId: 'price_essential_monthly',
    popular: false,
    gradient: 'from-blue-50 via-blue-50 to-blue-100',
    icon: <Zap className="h-6 w-6 text-blue-600" />,
    buttonText: 'Get Essential',
    buttonVariant: 'outline',
    features: [
      { text: 'Standard tech support for inbound and outbound AI voice agents', included: true },
      { text: 'Email and chat support during business hours', included: true },
      { text: 'Monthly performance reports covering both inbound and outbound operations', included: true },
      { text: 'Basic script adjustments and updates', included: true },
      { text: 'One 60-minute strategy call per week', included: true },
      { text: 'Basic automation setup included (simple workflows and integrations)', included: true },
      { text: 'Advanced script customization and A/B testing', included: false },
      { text: 'Dedicated account manager', included: false },
      { text: 'Real-time support', included: false },
    ]
  },
  {
    id: 'professional',
    name: 'Professional Support',
    price: 1500,
    period: 'month',
    description: 'Ideal for growing businesses that need advanced features and priority support',
    stripePriceId: 'price_professional_monthly',
    popular: true,
    gradient: 'from-purple-50 via-purple-50 to-purple-100',
    icon: <Crown className="h-6 w-6 text-purple-600" />,
    buttonText: 'Get Professional',
    buttonVariant: 'default',
    features: [
      { text: 'Everything in the Essential Support Plan', included: true },
      { text: 'Priority email and chat support with faster response times', included: true },
      { text: 'Bi-weekly performance reviews and strategy sessions', included: true },
      { text: 'Advanced script customization and A/B testing', included: true },
      { text: 'Two 60-minute strategy calls per week', included: true },
      { text: 'Intermediate automation setup included (more complex workflows and integrations)', included: true },
      { text: 'Dedicated account manager for personalized service', included: false },
      { text: 'Weekly strategy calls and real-time support', included: false },
      { text: 'Unlimited script changes and on-demand customization', included: false },
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Custom',
    price: 'custom',
    period: 'based on needs',
    description: 'Fully customized solution for large enterprises with specific requirements',
    popular: false,
    gradient: 'from-green-50 via-green-50 to-green-100',
    icon: <Sparkles className="h-6 w-6 text-green-600" />,
    buttonText: 'Contact Sales',
    buttonVariant: 'outline',
    features: [
      { text: 'Everything in the Professional Support Plan', included: true },
      { text: 'Dedicated account manager for personalized service', included: true },
      { text: 'Weekly strategy calls, performance optimization, and real-time support', included: true },
      { text: 'Unlimited script changes and on-demand customization', included: true },
      { text: 'Advanced automation setup included (custom workflows, extensive integrations)', included: true },
      { text: 'Custom integrations and tailored solutions', included: true },
      { text: 'SLA guarantees and premium support', included: true },
      { text: '24/7 priority support hotline', included: true },
      { text: 'Quarterly business reviews and optimization sessions', included: true },
    ]
  }
];

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // Load Stripe configuration from Supabase
  useEffect(() => {
    loadStripeConfig();
  }, []);

  const loadStripeConfig = async () => {
    try {
      const { data: config, error } = await supabase
        .from('stripe_configurations')
        .select('public_key, is_active')
        .eq('environment', 'test') // Use 'production' in production
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error loading Stripe config:', error);
        setError('Payment system configuration error. Please contact support.');
        return;
      }

      if (config?.public_key) {
        // Initialize Stripe with the loaded public key
        // In a real implementation, you'd load the Stripe script and initialize it here
        console.log('Stripe configured with key:', config.public_key.substring(0, 12) + '...');
        setStripeLoaded(true);
      }
    } catch (err) {
      console.error('Exception loading Stripe config:', err);
      setError('Failed to load payment configuration');
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      setError('Please log in to subscribe to a plan');
      return;
    }

    if (!stripeLoaded) {
      setError('Payment system not ready. Please try again in a moment.');
      return;
    }

    setProcessingPlan(plan.id);
    setError(null);

    try {
      // Create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: plan.stripePriceId,
          userId: user.id,
          planName: plan.name,
          successUrl: `${window.location.origin}/pricing?success=true&plan=${plan.id}`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }

    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(`Subscription error: ${err.message}`);
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleContactSales = () => {
    const phoneNumber = "+573107771810";
    const message = "Hello! I'm interested in the Enterprise Custom Plan for Dr. Scale AI platform. Could you please provide more information about pricing and custom features?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleContactForAutomation = () => {
    const email = "sales@drscaleai.com";
    const subject = "Custom Automation Add-On Inquiry";
    const body = "Hello,\n\nI'm interested in learning more about the Custom Automation Add-On services for extensive automation work, complex backend workflows, and additional integrations.\n\nCould you please provide:\n1. Detailed scope of automation services\n2. Pricing structure\n3. Timeline estimates\n4. Examples of previous automation projects\n\nThank you!";
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Handle URL parameters for success/cancel redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const planId = urlParams.get('plan');

    if (success === 'true') {
      setError(null);
      // Show success message
      alert(`🎉 Subscription successful! Welcome to the ${planId} plan. You'll receive a confirmation email shortly.`);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled === 'true') {
      setError('Payment was canceled. You can try again anytime.');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              Dr. Scale Comprehensive Support Plans
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Perfect Plan
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Scale your AI voice operations with our comprehensive support plans. 
              From essential features to enterprise-grade solutions.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50 max-w-2xl mx-auto mb-8">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-lg">⚠️</span>
                  </div>
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`
                  relative border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden
                  bg-gradient-to-br ${plan.gradient}
                  ${plan.popular ? 'scale-105 ring-2 ring-purple-200' : 'hover:scale-105'}
                `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 text-sm font-bold">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    {plan.icon}
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </CardTitle>
                  
                  <div className="mb-4">
                    {typeof plan.price === 'number' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">
                          ${plan.price.toLocaleString()}
                        </span>
                        <span className="text-gray-600 ml-2">/ {plan.period}</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        Custom Pricing
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="px-6 pb-6">
                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`
                          flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                          ${feature.included 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-gray-100 text-gray-400'
                          }
                        `}>
                          {feature.included ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span className="text-xs">✕</span>
                          )}
                        </div>
                        <span className={`
                          text-sm leading-relaxed
                          ${feature.included ? 'text-gray-700' : 'text-gray-400'}
                        `}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => plan.id === 'enterprise' ? handleContactSales() : handleSubscribe(plan)}
                    disabled={processingPlan === plan.id || (plan.stripePriceId && !stripeLoaded)}
                    variant={plan.buttonVariant}
                    className={`
                      w-full py-3 font-semibold text-lg transition-all duration-300
                      ${plan.buttonVariant === 'default' 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl' 
                        : 'border-2 hover:bg-white/80'
                      }
                      ${processingPlan === plan.id ? 'opacity-70' : ''}
                    `}
                  >
                    {processingPlan === plan.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        Processing...
                      </div>
                    ) : (
                      plan.buttonText
                    )}
                  </Button>

                  {/* Additional info for custom plan */}
                  {plan.id === 'enterprise' && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Get a personalized quote based on your specific needs
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Automation Add-On Section */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 mb-16">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <Settings className="h-10 w-10 text-orange-600" />
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Need Extensive Automation?
              </h3>
              
              <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                For clients requiring more in-depth automation, complex backend workflows, or additional integrations, 
                we provide a custom quote based on the scope and complexity of the work.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Complex Workflows</h4>
                  <p className="text-sm text-gray-600">Advanced backend automation and data processing</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Custom Integrations</h4>
                  <p className="text-sm text-gray-600">Seamless connection with your existing systems</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Tailored Solutions</h4>
                  <p className="text-sm text-gray-600">Built specifically for your business requirements</p>
                </div>
              </div>
              
              <Button
                onClick={handleContactForAutomation}
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Request Custom Quote
              </Button>
            </CardContent>
          </Card>

          {/* FAQ or Support Section */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Need Help Choosing?
              </h3>
              
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Our team is here to help you find the perfect plan for your business needs. 
                Get in touch and we'll guide you through the options.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => {
                    const phoneNumber = "+573107771810";
                    const message = "Hello! I need help choosing the right Dr. Scale AI support plan for my business. Could you please assist me?";
                    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with Sales
                </Button>
                
                <Button
                  onClick={() => window.location.href = "mailto:sales@drscaleai.com"}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email Sales Team
                </Button>
                
                <Button
                  onClick={() => window.location.href = "/support"}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  View Support Options
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default PricingPage;
