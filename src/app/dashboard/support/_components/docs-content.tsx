"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const helpTopics = [
  {
    id: "getting-started",
    title: "Getting Started",
    content: `Welcome to Author Automations Social! Here's how to get up and running quickly.

After signing in, you'll land on your Dashboard which shows an overview of your upcoming scheduled posts and connected accounts. Your first step should be connecting at least one social media account from the Accounts page.

Once you have an account connected, head to the Compose page to create your first post. You can write your content, attach images or video, select which accounts to publish to, and either publish immediately, schedule for a specific date and time, or add it to your posting queue.`,
  },
  {
    id: "connecting-accounts",
    title: "Connecting Accounts",
    content: `Author Automations supports 13 social media platforms: Instagram, TikTok, YouTube, LinkedIn, Pinterest, X/Twitter, Facebook, Threads, Bluesky, Snapchat, Google Business, Reddit, and Telegram.

To connect an account, go to the Accounts page and click "Connect Account." You'll be redirected to the platform's authorization page where you'll grant access. Some platforms (Facebook, LinkedIn, Pinterest, Google Business) require an additional step where you select which page, organization, board, or location to connect.

To disconnect an account, click the disconnect button on the account card. This revokes access and removes the account from your posting options. You can reconnect at any time.`,
  },
  {
    id: "creating-posts",
    title: "Creating Posts",
    content: `The Compose page is where you create and schedule your social media content.

Write your post content in the main text area. You can attach images (JPEG, PNG, GIF, WebP) or videos (MP4, MOV, WebM) by uploading from your device. Select one or more connected accounts to publish to.

Each platform has its own character limits and media requirements. The compose page will warn you if your content exceeds a platform's limits. You can also add platform-specific content if you want different text for different platforms.`,
  },
  {
    id: "scheduling",
    title: "Scheduling & Queue",
    content: `There are three ways to publish a post:

Publish Now: Send the post immediately to your selected platforms.

Schedule: Pick a specific date and time for the post to go out. Use the date/time picker in the compose page and make sure your timezone is set correctly in Settings.

Add to Queue: Queue slots are recurring time slots you set up on the Queue page. When you add a post to the queue, it will be published at the next available slot. This is great for maintaining a consistent posting schedule without picking individual times.

To manage your queue, go to the Queue page. Create named queues with time slots for each day of the week. Set a default queue that posts will be added to automatically. You can have multiple queues for different content strategies.`,
  },
  {
    id: "calendar",
    title: "Calendar",
    content: `The Calendar page gives you a visual overview of all your scheduled and published posts.

Switch between Grid view (monthly calendar) and List view using the toggle buttons. In grid view, posts appear on their scheduled dates with color-coded status indicators: blue for scheduled, green for published, red for failed.

You can reschedule posts by dragging them to a different day in the grid view. The original time of day is preserved — only the date changes. Click any post to view its details or delete it.`,
  },
  {
    id: "api-automation",
    title: "API & Automation",
    content: `Author Automations provides an API for integrating with automation tools like Make.com, Zapier, and n8n.

To get started, go to Settings and generate an API key. Your key will be shown only once — copy and save it in a secure place. You can revoke and regenerate your key at any time.

Use your API key with the Authorization header: "Bearer aa_sk_your_key_here". The API supports creating posts (POST /api/v1/posts), listing posts (GET /api/v1/posts), getting a single post (GET /api/v1/posts/:id), and deleting posts (DELETE /api/v1/posts/:id).

The API is rate-limited to 100 requests per hour per user.`,
  },
  {
    id: "account-billing",
    title: "Account & Billing",
    content: `Manage your account settings from the Settings page.

Appearance: Switch between light, dark, or system theme.

Timezone: Set your default timezone for scheduling. This ensures your posts go out at the time you expect, regardless of where you are.

Subscription: View your current plan and billing details. If you have a Stripe subscription, click "Manage Subscription" to update your payment method, change plans, or view invoices through the Stripe Customer Portal.

To sign out, use the Sign Out option in Settings or from the user menu in the header.`,
  },
];

export function DocsContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse our help documentation to learn how to use Author Automations Social.
      </p>
      <Accordion type="multiple" className="w-full">
        {helpTopics.map((topic) => (
          <AccordionItem key={topic.id} value={topic.id}>
            <AccordionTrigger className="text-sm font-medium">
              {topic.title}
            </AccordionTrigger>
            <AccordionContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {topic.content.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
