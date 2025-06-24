import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ActionBias - AI-Forward Planning System",
  description: "Transform ephemeral AI conversations into a durable planning platform. Cross-LLM persistence, intelligent planning, and production-ready infrastructure.",
  keywords: ["AI", "planning", "MCP", "cross-LLM", "project management", "artificial intelligence"],
  authors: [{ name: "ActionBias Team" }],
  openGraph: {
    title: "ActionBias - AI-Forward Planning System",
    description: "AI-forward planning that persists across conversations",
    type: "website",
    url: "https://actionbias.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActionBias - AI-Forward Planning System",
    description: "AI-forward planning that persists across conversations",
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