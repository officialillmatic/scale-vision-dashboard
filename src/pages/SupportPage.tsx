import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, BookOpen, ExternalLink } from 'lucide-react';

const SupportPage = () => {
  const handleWhatsAppContact = () => {
    const phoneNumber = "+573107771810";
    const message = "Hello! I need help with Dr. Scale AI platform. Could you please assist me?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmailSupport = () => {
    window.location.href = "mailto:support@drscale.com";
  };

  const handleStartChat = () => {
    // Aquí puedes integrar tu sistema de chat en vivo
    // Por ahora, redirigir a WhatsApp como alternativa
    handleWhatsAppContact();
  };

  const handleBrowseArticles = () => {
    // Aquí puedes redirigir a tu base de conocimientos
    // Por ahora, como placeholder
    alert("Knowledge Base coming soon!");
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Support Center</h1>
          </div>

          {/* Main Support Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Chat Support */}
            <Card className="text-center p-8 bg-white shadow-lg border-0">
              <CardContent className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Chat Support</h2>
                  <p className="text-gray-600 mb-4">
                    Chat with our support team during business hours.
                  </p>
                  <p className="text-sm font-medium text-gray-700 mb-6">
                    Available Mon-Fri, 9am-5pm EST
                  </p>
                  
                  <Button 
                    onClick={handleStartChat}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                  >
                    Start Chat
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Email Support */}
            <Card className="text-center p-8 bg-white shadow-lg border-0">
              <CardContent className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Email Support</h2>
                  <p className="text-gray-600 mb-4">
                    Send us an email and we'll respond within 24 hours.
                  </p>
                  <p className="text-sm font-medium text-blue-600 mb-6">
                    support@drscaleai.com
                  </p>
                  
                  <Button 
                    onClick={handleEmailSupport}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 rounded-lg font-medium"
                  >
                    Send Email
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Knowledge Base */}
            <Card className="text-center p-8 bg-white shadow-lg border-0">
              <CardContent className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Knowledge Base</h2>
                  <p className="text-gray-600 mb-4">
                    Explore guides and tutorials to get the most out of Dr Scale.
                  </p>
                  <p className="text-sm font-medium text-gray-700 mb-6">
                    Find answers to common questions
                  </p>
                  
                  <Button 
                    onClick={handleBrowseArticles}
                    variant="outline"
                    className="border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-3 rounded-lg font-medium"
                  >
                    Browse Articles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Support Section */}
          <div className="text-center bg-white rounded-2xl shadow-lg p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Support</h2>
            <p className="text-lg text-gray-600 mb-8">
              Need immediate help? Contact us directly on WhatsApp
            </p>

            <Button 
              onClick={handleWhatsAppContact}
              className="bg-green-500 hover:bg-green-600 text-white px-12 py-4 rounded-xl font-semibold text-lg inline-flex items-center gap-3 shadow-lg"
            >
              <MessageCircle className="h-6 w-6" />
              Contact us on WhatsApp
            </Button>

            <p className="text-gray-500 mt-4 text-sm">
              We'll respond as soon as possible during business hours
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SupportPage;