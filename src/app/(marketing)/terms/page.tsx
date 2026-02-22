import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Author Automations Social",
  description: "Terms of Service for Author Automations Social",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            &larr; Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p className="mt-2">
              By accessing or using Author Automations Social (&quot;the
              Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p className="mt-2">
              Author Automations Social is a social media scheduling platform
              that allows you to create, schedule, and publish content across
              multiple social media platforms. The Service acts as an
              intermediary between you and the social media platforms you connect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. Account Registration
            </h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 18 years old to use the Service</li>
              <li>One person or entity per account (no shared accounts)</li>
              <li>You are responsible for all activity under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Subscriptions and Billing
            </h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                The Service requires a paid subscription, billed monthly or
                annually through Stripe
              </li>
              <li>
                Subscriptions auto-renew unless canceled before the renewal date
              </li>
              <li>You may cancel your subscription at any time from your account settings</li>
              <li>
                Refunds are available within 7 days of initial purchase if you
                are not satisfied
              </li>
              <li>
                We reserve the right to change pricing with 30 days advance
                notice
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Acceptable Use
            </h2>
            <p className="mt-2">You agree not to use the Service to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Violate any applicable laws or the terms of service of connected
                social media platforms
              </li>
              <li>
                Post content that is illegal, defamatory, harassing, or
                infringes on intellectual property rights
              </li>
              <li>Distribute spam, malware, or engage in phishing</li>
              <li>
                Attempt to circumvent rate limits, security measures, or access
                controls
              </li>
              <li>
                Use automated tools to scrape, harvest, or collect data from the
                Service
              </li>
              <li>
                Impersonate other individuals or misrepresent your affiliation
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Content Ownership
            </h2>
            <p className="mt-2">
              You retain all ownership rights to the content you create and
              publish through the Service. By using the Service, you grant us a
              limited license to store, process, and transmit your content solely
              for the purpose of providing the Service. We do not claim
              ownership of your content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Third-Party Platforms
            </h2>
            <p className="mt-2">
              The Service integrates with third-party social media platforms. We
              are not responsible for the availability, terms, or policies of
              these platforms. Your use of connected platforms is subject to
              their respective terms of service. We are not liable for content
              that fails to publish due to platform restrictions or API changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Service Availability
            </h2>
            <p className="mt-2">
              We strive to maintain high availability but do not guarantee
              uninterrupted service. We may perform scheduled maintenance with
              advance notice. We are not liable for temporary outages, delays in
              publishing, or failures caused by third-party platforms or
              infrastructure providers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Limitation of Liability
            </h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Author Automations Social
              shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the Service. Our
              total liability shall not exceed the amount you paid for the
              Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              10. Termination
            </h2>
            <p className="mt-2">
              We may suspend or terminate your account if you violate these
              Terms. You may delete your account at any time. Upon termination,
              your right to use the Service ceases immediately. We will delete
              your data in accordance with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              11. Changes to Terms
            </h2>
            <p className="mt-2">
              We may modify these Terms at any time. Material changes will be
              communicated via email or through the Service. Continued use after
              changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              12. Contact
            </h2>
            <p className="mt-2">
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:support@authorautomations.com"
                className="text-primary hover:underline"
              >
                support@authorautomations.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
