import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LateWiz - Social Media Scheduling Made Simple",
  description:
    "Your social media scheduling wizard. Schedule posts across 13 platforms with a single tool, powered by Late.",
  keywords: [
    "social media scheduler",
    "instagram scheduler",
    "tiktok scheduler",
    "twitter scheduler",
    "linkedin scheduler",
    "social media management",
    "content scheduling",
  ],
  authors: [{ name: "Late", url: "https://getlate.dev" }],
  openGraph: {
    title: "LateWiz - Social Media Scheduling Made Simple",
    description:
      "Your social media scheduling wizard. Schedule posts across 13 platforms with a single tool.",
    url: "https://latewiz.com",
    siteName: "LateWiz",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LateWiz - Social Media Scheduling Made Simple",
    description:
      "Your social media scheduling wizard. Schedule posts across 13 platforms with a single tool.",
  },
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
