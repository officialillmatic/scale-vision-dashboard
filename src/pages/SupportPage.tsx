
import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SupportPage() {
  const { user } = useAuth();

  const handleWhatsAppClick = () => {
    const phoneNumber = "573107771810";
    const message = "Hi, I need help with Dr. Scale";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Support Center</h1>
        
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span>Chat Support</span>
              </CardTitle>
              <CardDescription>
                Chat with our support team during business hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">Available Mon-Fri, 9am-5pm EST</p>
              <Button variant="outline" className="w-full">
                Start Chat
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span>Email Support</span>
              </CardTitle>
              <CardDescription>
                Send us an email and we'll respond within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">support@drscale.com</p>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = "mailto:support@drscale.com"}>
                Send Email
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5" />
                <span>Knowledge Base</span>
              </CardTitle>
              <CardDescription>
                Explore guides and tutorials to get the most out of EchoWave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">Find answers to common questions</p>
              <Button variant="outline" className="w-full">
                Browse Articles
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>
              Need immediate help? Contact us directly on WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Button
              onClick={handleWhatsAppClick}
              className="bg-[#25D366] hover:bg-[#20b858] text-white text-lg px-8 py-6 h-auto rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              size="lg"
            >
              <MessageCircle className="h-6 w-6 mr-3" />
              Contact us on WhatsApp
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              We'll respond as soon as possible during business hours
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
