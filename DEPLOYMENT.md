# Author Automations Social - Deployment Guide

This guide covers deploying Author Automations Social to Digital Ocean App Platform with Supabase authentication and Stripe payments.

## Prerequisites

- Digital Ocean account
- Supabase project
- Stripe account with products configured
- GetLate API account with master key (200 sub-accounts)

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL: `https://[project-id].supabase.co`
3. Get your keys from Project Settings → API:
   - `anon` public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - `service_role` secret key (SUPABASE_SERVICE_ROLE_KEY)

### Create Database Schema

Run the following SQL in the Supabase SQL Editor:

```sql
-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  getlate_profile_id TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'inactive')),
  subscription_id TEXT,
  price_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Service role has full access (for webhooks)
CREATE POLICY "Service role full access" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Configure Authentication

1. Go to Authentication → URL Configuration
2. Set Site URL to your production domain (e.g., `https://social.authorautomations.com`)
3. Add redirect URLs:
   - `https://social.authorautomations.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

4. Go to Authentication → Email Templates
5. Customize the magic link email template (optional)

---

## 2. Stripe Setup

### Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Create a product called "Author Automations Social"
3. Add two prices:
   - **Monthly**: $X/month (recurring)
   - **Annual**: $X/year (recurring)
4. Note the price IDs (e.g., `price_1RvOYhJ7dptCyQA0pvznjt0R`)

### Create Webhook

1. Go to Developers → Webhooks
2. Add endpoint: `https://social.authorautomations.com/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Note the webhook signing secret (STRIPE_WEBHOOK_SECRET)

### Configure Customer Portal

1. Go to Settings → Billing → Customer Portal
2. Enable the features you want (subscription management, invoice history, etc.)
3. Set the default return URL to your app

---

## 3. Digital Ocean Setup

### Create App

1. Go to Digital Ocean → Apps → Create App
2. Connect your GitHub repository
3. Select the branch to deploy (usually `main`)

### Configure Environment Variables

In the App Settings → App-Level Environment Variables, add:

| Variable | Value | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-id].supabase.co` | Build + Run |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Build + Run (Encrypted) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Run (Encrypted) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Run (Encrypted) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Run (Encrypted) |
| `NEXT_PUBLIC_STRIPE_PRICE_MONTHLY` | `price_...` | Build + Run |
| `NEXT_PUBLIC_STRIPE_PRICE_ANNUAL` | `price_...` | Build + Run |
| `LATE_API_KEY` | Your master API key | Run (Encrypted) |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Build + Run |

### Configure Domain

1. In App Settings → Domains, add your custom domain
2. Follow the DNS configuration instructions
3. Enable HTTPS (automatic with Let's Encrypt)

---

## 4. Local Development

### Environment Setup

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_test_... (use test key for development)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ANNUAL=price_...

# GetLate
LATE_API_KEY=your_master_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Stripe Webhook Testing

For local webhook testing, use the Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Note the webhook signing secret provided and update .env.local
```

### Run Development Server

```bash
npm install
npm run dev
```

---

## 5. Post-Deployment Checklist

- [ ] Verify health check endpoint: `https://your-domain.com/api/health`
- [ ] Test complete signup flow: Pricing → Stripe → Magic Link → Dashboard
- [ ] Test returning user login flow
- [ ] Verify webhook events are received in Stripe dashboard
- [ ] Test subscription cancellation via Customer Portal
- [ ] Confirm social account connections work
- [ ] Test post scheduling end-to-end

---

## Troubleshooting

### Common Issues

**Magic link emails not sending:**
- Check Supabase email settings
- Verify Site URL is configured correctly
- Check spam folder

**Stripe webhook 400 errors:**
- Verify STRIPE_WEBHOOK_SECRET is correct
- Check the raw body is being passed to `constructEvent`

**Posts not appearing:**
- Verify LATE_API_KEY has correct permissions
- Check that getlate_profile_id was created during signup

**Authentication issues:**
- Clear browser cookies/localStorage
- Check Supabase auth logs

### Logs

View application logs in Digital Ocean:
- Apps → Your App → Runtime Logs

View Supabase logs:
- Database → Logs (for SQL queries)
- Authentication → Logs (for auth events)

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│  Supabase   │
│             │◀────│   App       │◀────│   Auth      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  GetLate    │
                    │    API      │
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Social    │
                    │  Platforms  │
                    └─────────────┘
```

**Data Flow:**
1. User pays via Stripe → Webhook creates Supabase profile + GetLate profile
2. User clicks magic link → Supabase authenticates → Links to profile
3. All API calls go through Next.js routes → Validates session → Calls GetLate with master key
4. Each user only sees their own data (tenant isolation via profile ID filtering)
