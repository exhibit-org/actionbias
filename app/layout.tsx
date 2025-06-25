import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ActionBias - Dream like a human. Execute like a machine.",
  description: "The AI-forward planning platform that transforms your vision into precisely calibrated instructions any AI can follow. Let your imagination run wild, then execute flawlessly.",
  keywords: ["AI", "planning", "MCP", "cross-LLM", "project management", "artificial intelligence", "AI agents", "context-aware"],
  authors: [{ name: "ActionBias Team" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://actionbias.com'),
  openGraph: {
    title: "ActionBias - Dream like a human. Execute like a machine.",
    description: "Let your imagination run wild. Explore possibilities. When you're ready, ActionBias transforms your vision into precisely calibrated instructions any AI can follow.",
    type: "website",
    siteName: "ActionBias",
    images: [
      {
        url: "https://actionbias.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "ActionBias - Where human creativity meets machine precision",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ActionBias - Dream like a human. Execute like a machine.",
    description: "Let your imagination run wild. Explore possibilities. When you're ready, ActionBias transforms your vision into precisely calibrated instructions.",
    images: ["https://actionbias.com/og-image.png"],
    creator: "@actionbias",
  },
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}