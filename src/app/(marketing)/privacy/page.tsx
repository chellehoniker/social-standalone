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
          Last updated: March 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Introduction
            </h2>
            <p className="mt-2">
              Author Automations Social (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;) operates the social media scheduling platform
              available at authorautomations.social. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your
              information when you use our service, including our web
              application, REST API, and Claude Code/Cowork plugin.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <p className="mt-2">We collect information you provide directly:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Account information: email address and authentication
                credentials when you create an account
              </li>
              <li>
                Social media account tokens: OAuth access tokens for the social
                media platforms you connect (Instagram, TikTok, Facebook,
                LinkedIn, Twitter/X, YouTube, Pinterest, Threads, Bluesky,
                Snapchat, Google Business, Reddit, Telegram)
              </li>
              <li>
                Content: posts, captions, images, videos, and scheduling data
                you create through our service
              </li>
              <li>
                Payment information: billing details processed securely through
                Stripe (we do not store your full credit card number)
              </li>
              <li>
                Third-party API keys: if you use AI features, you may provide
                API keys for OpenAI, Anthropic, Google Gemini, and/or FreePik.
                These keys are encrypted at rest using AES-256-GCM encryption
                and are never exposed to other users or transmitted in
                plaintext
              </li>
              <li>
                Content guides: prose style, brand voice, copywriting, and
                social media strategy guides you create to inform AI-generated
                content
              </li>
              <li>
                Campaign data: campaign objectives, content plans, and
                generated media associated with AI campaign features
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
              <li>
                To generate AI-powered content (captions, images, videos, and
                music) using the third-party AI services you have configured
              </li>
              <li>To process payments and manage your subscription</li>
              <li>
                To send service-related communications (account verification,
                billing, support ticket updates)
              </li>
              <li>To detect and prevent fraud, abuse, and security issues</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Third-Party AI Services
            </h2>
            <p className="mt-2">
              When you enable AI features and provide your own API keys, we
              use those keys to call the following third-party services on
              your behalf:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                <strong className="text-foreground">OpenAI, Anthropic, or Google Gemini</strong>: to generate
                social media captions and campaign content plans. Your
                campaign objective, content guides, and platform preferences
                are sent to the AI provider you select. We do not send your
                personal information or account credentials to these services.
              </li>
              <li>
                <strong className="text-foreground">FreePik</strong>: to generate AI images, videos, and music
                for your social media posts. Image prompts and style
                preferences are sent to FreePik. Generated media is stored
                temporarily on FreePik&apos;s CDN.
              </li>
            </ul>
            <p className="mt-2">
              Your API keys for these services are encrypted at rest using
              AES-256-GCM encryption. They are decrypted only at the moment
              of use on our server and are never logged, cached, or exposed
              to other users. You may revoke your keys at any time by removing
              them from your settings.
            </p>
            <p className="mt-2">
              Each third-party service has its own privacy policy and data
              handling practices. We encourage you to review their policies.
              We are not responsible for how these services process the data
              sent to them on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. API Access and Integrations
            </h2>
            <p className="mt-2">
              We provide a REST API and a Claude Code/Cowork plugin that
              allow you to access your account programmatically. When you
              generate an API key:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                Your API key is hashed using SHA-256 before storage. We do
                not store the plaintext key after initial generation.
              </li>
              <li>
                API access is scoped to your account only. You cannot access
                other users&apos; data, accounts, or content through the API.
              </li>
              <li>
                API requests are rate-limited to 100 requests per hour per
                key.
              </li>
              <li>
                The Claude Code/Cowork plugin stores your API key locally on
                your device. It is not transmitted to Anthropic or any party
                other than our API server.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Data Sharing
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
                AI service providers: to generate content using your API keys,
                as described in Section 4
              </li>
              <li>
                Payment processors: Stripe, for subscription billing
              </li>
              <li>
                Service providers: hosting (DigitalOcean), database
                (Supabase), and email (Amazon SES) providers who assist in
                operating our service
              </li>
              <li>
                Legal authorities: when required by law or to protect our rights
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Data Security
            </h2>
            <p className="mt-2">
              We implement industry-standard security measures to protect your
              data:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                All authentication with social media platforms is handled
                through OAuth &mdash; we never store your social media
                passwords
              </li>
              <li>
                Data is encrypted in transit using TLS
              </li>
              <li>
                Third-party API keys are encrypted at rest using AES-256-GCM
              </li>
              <li>
                API keys are hashed using SHA-256 with constant-time
                comparison to prevent timing attacks
              </li>
              <li>
                Row-level security (RLS) ensures each user can only access
                their own data
              </li>
              <li>
                Multi-tenant isolation ensures your social accounts, posts,
                and campaigns are not visible to other users
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Data Retention
            </h2>
            <p className="mt-2">
              We retain your account data for as long as your account is active.
              When you delete your account, we will delete your personal data
              within 30 days, except where we are required to retain it for legal
              or compliance purposes. This includes:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Social media access tokens are revoked upon account disconnection</li>
              <li>Encrypted API keys are deleted when removed from settings or upon account deletion</li>
              <li>Campaign data and generated media URLs are deleted with your account</li>
              <li>Content guides are deleted with your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Your Rights
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
              <li>Disconnect any social media account at any time</li>
              <li>Revoke your API key at any time</li>
              <li>Remove your third-party AI keys at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              10. Cookies
            </h2>
            <p className="mt-2">
              We use essential cookies for authentication and session management.
              We do not use third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              11. Changes to This Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. We will notify
              you of material changes by email or through a notice on our
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              12. Contact Us
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
