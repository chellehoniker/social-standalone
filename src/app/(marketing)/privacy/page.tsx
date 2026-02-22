import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Author Automations Social",
  description: "Privacy Policy for Author Automations Social",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: February 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Introduction
            </h2>
            <p className="mt-2">
              Author Automations Social (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;) operates the social media scheduling platform
              available at social.authorautomations.com. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <p className="mt-2">We collect information you provide directly:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Account information: email address, name, and password when you
                create an account
              </li>
              <li>
                Social media account tokens: OAuth access tokens for the social
                media platforms you connect
              </li>
              <li>
                Content: posts, images, videos, and scheduling data you create
                through our service
              </li>
              <li>
                Payment information: billing details processed securely through
                Stripe (we do not store your full credit card number)
              </li>
              <li>
                Support requests: information you provide when contacting our
                support team
              </li>
            </ul>
            <p className="mt-4">
              We automatically collect certain information:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Usage data: features used, scheduling patterns, and interaction
                data
              </li>
              <li>
                Device information: browser type, operating system, and device
                identifiers
              </li>
              <li>Log data: IP address, access times, and pages viewed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. How We Use Your Information
            </h2>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                To provide, maintain, and improve our social media scheduling
                service
              </li>
              <li>
                To publish and schedule content to your connected social media
                accounts
              </li>
              <li>To process payments and manage your subscription</li>
              <li>
                To send service-related communications (account verification,
                billing, support)
              </li>
              <li>To detect and prevent fraud, abuse, and security issues</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell your personal information. We share data only with:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Social media platforms: to publish your content as directed by
                you
              </li>
              <li>
                Payment processors: Stripe, for subscription billing
              </li>
              <li>
                Service providers: hosting, analytics, and infrastructure
                providers who assist in operating our service
              </li>
              <li>
                Legal authorities: when required by law or to protect our rights
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Data Security
            </h2>
            <p className="mt-2">
              We implement industry-standard security measures to protect your
              data. All authentication with social media platforms is handled
              through OAuth &mdash; we never store your social media passwords.
              Data is encrypted in transit using TLS and at rest where
              applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Data Retention
            </h2>
            <p className="mt-2">
              We retain your account data for as long as your account is active.
              When you delete your account, we will delete your personal data
              within 30 days, except where we are required to retain it for legal
              or compliance purposes. Social media access tokens are revoked upon
              account disconnection.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Your Rights
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
              <li>Disconnect any social media account at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Cookies
            </h2>
            <p className="mt-2">
              We use essential cookies for authentication and session management.
              We do not use third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will notify
              you of material changes by email or through a notice on our
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              10. Contact Us
            </h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy, contact us at{" "}
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
