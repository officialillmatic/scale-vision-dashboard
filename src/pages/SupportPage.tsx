
import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageCircle, Phone, ExternalLink, BookOpen, Users, Zap } from 'lucide-react';

const SupportPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
          <p className="text-muted-foreground">
            Get help with Dr. Scale AI and connect with our support team
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                Contact Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get direct help from our support team
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Support
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Phone className="mr-2 h-4 w-4" />
                  Schedule Call
                </Button>
              </div>
              <Badge variant="secondary" className="text-xs">
                Response within 24h
              </Badge>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Learn how to use Dr. Scale AI effectively
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  User Guide
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Zap className="mr-2 h-4 w-4" />
                  API Documentation
                </Button>
              </div>
              <Badge variant="secondary" className="text-xs">
                Always up to date
              </Badge>
            </CardContent>
          </Card>

          {/* Community */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Community
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect with other Dr. Scale users
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join Discord
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Forum
                </Button>
              </div>
              <Badge variant="secondary" className="text-xs">
                Active community
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Quick Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Help</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Set up your first AI agent</li>
                  <li>• Configure call routing</li>
                  <li>• Understand analytics</li>
                  <li>• Manage team members</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Common Issues</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Call quality problems</li>
                  <li>• Agent not responding</li>
                  <li>• Billing questions</li>
                  <li>• Integration setup</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">All systems operational</span>
              <Badge variant="outline" className="ml-auto text-xs">
                99.9% uptime
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SupportPage;
