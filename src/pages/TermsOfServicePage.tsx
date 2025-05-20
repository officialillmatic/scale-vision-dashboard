
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/3cab64ed-2b97-4974-9c76-8ae4f310234d.png" 
              alt="Dr. Scale Logo" 
              className="h-10 w-auto"
            />
            <span className="font-bold text-xl">Dr. Scale</span>
          </div>
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="bg-card rounded-lg p-8 shadow-sm">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                Welcome to Dr. Scale. These Terms of Service ("Terms") govern your use of our website, products, and services ("Services"). By accessing or using our Services, you agree to be bound by these Terms. If you disagree with any part of the Terms, you may not access the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Use of Services</h2>
              <p>
                Dr. Scale provides AI-powered call analytics services. You agree to use these Services only for lawful purposes and in accordance with these Terms. You are responsible for ensuring that your use complies with applicable laws and regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. User Accounts</h2>
              <p>
                When you create an account with us, you must provide accurate and complete information. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Intellectual Property</h2>
              <p>
                The Services and its original content, features, and functionality are owned by Dr. Scale and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our Services without our explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Collection and Usage</h2>
              <p>
                By using our Services, you consent to the collection and use of information as detailed in our Privacy Policy. You understand that your call data will be processed by our AI systems to provide analytics and insights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Subscription and Payments</h2>
              <p>
                Some of our Services may require payment and subscription. By subscribing to these Services, you agree to pay all fees and charges associated with your account on a timely basis. All payments are non-refundable unless otherwise specified.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Termination</h2>
              <p>
                We may terminate or suspend access to our Services immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Limitation of Liability</h2>
              <p>
                In no event shall Dr. Scale, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Services after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at support@drscale.com.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Last updated: May 20, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
