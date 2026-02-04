import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Author Automations Social - Social Media Scheduling",
  description:
    "Schedule your social media posts across 13 platforms from one powerful interface. Built for authors and content creators.",
  keywords: [
    "social media scheduler",
    "author social media",
    "instagram scheduler",
    "tiktok scheduler",
    "twitter scheduler",
    "linkedin scheduler",
    "social media management",
    "content scheduling",
    "book marketing",
    "author platform",
  ],
  authors: [{ name: "Author Automations" }],
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Author Automations Social - Social Media Scheduling",
    description:
      "Schedule your social media posts across 13 platforms from one powerful interface.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://social.authorautomations.com",
    siteName: "Author Automations Social",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Author Automations Social - Social Media Scheduling",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Author Automations Social - Social Media Scheduling",
    description:
      "Schedule your social media posts across 13 platforms from one powerful interface.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://social.authorautomations.com"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
