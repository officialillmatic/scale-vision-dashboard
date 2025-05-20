
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicyPage = () => {
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
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p>
                At Dr. Scale, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
              <p className="mb-2">
                We may collect several types of information from and about users of our Services, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Personal identifiers (such as name, email address, phone number)</li>
                <li>Account credentials</li>
                <li>Call recordings and transcripts</li>
                <li>Usage data and analytics</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p className="mb-2">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Providing, maintaining, and improving our Services</li>
                <li>Processing and completing transactions</li>
                <li>Sending you technical notices and support messages</li>
                <li>Responding to your comments and questions</li>
                <li>Training our AI models to improve call analytics</li>
                <li>Monitoring usage patterns and analyzing trends</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Call Recording and Analytics</h2>
              <p>
                Our primary service involves recording, transcribing, and analyzing calls. By using our Services, you consent to the recording and analysis of calls processed through our platform. You are responsible for ensuring that all parties on recorded calls are aware of and consent to recording where required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Sharing and Disclosure</h2>
              <p className="mb-2">
                We may share your information with:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Service providers who perform services on our behalf</li>
                <li>Business partners with your consent</li>
                <li>Legal authorities when required by law</li>
                <li>In connection with a business transfer or acquisition</li>
              </ul>
              <p className="mt-2">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
              <p className="mb-2">
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access to your personal data</li>
                <li>Correction of inaccurate data</li>
                <li>Deletion of your data</li>
                <li>Restriction or objection to processing</li>
                <li>Data portability</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, please contact us using the information provided below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our Services and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Children's Privacy</h2>
              <p>
                Our Services are not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16 years of age.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@drscale.com.
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

export default PrivacyPolicyPage;
