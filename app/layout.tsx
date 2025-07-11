import "./globals.css";
import type { Metadata } from "next";
import { QuickActionProvider } from "./contexts/QuickActionContext";
import { ActionCompletionProvider } from "./contexts/ActionCompletionContext";
import QuickActionModal from "./components/QuickActionModal";
import ActionCompletionModal from "./components/ActionCompletionModal";
import GlobalKeyboardListener from "./components/GlobalKeyboardListener";

// Ensure migrations on app startup
import { ensureMigrations } from "@/lib/db/ensure-migrations";

// Trigger migration check on server startup
if (typeof window === 'undefined') {
  ensureMigrations().catch(console.error);
}

export const metadata: Metadata = {
  title: "actions.engineering - Your context, everywhere. Never start over again.",
  description: "The context layer for AI development. Keep your entire project history alive across Claude Code, Gemini CLI, and every AI tool. Actions are the engine of more.",
  keywords: ["Claude Code", "Gemini CLI", "AI context", "MCP", "Model Context Protocol", "AI development", "context persistence", "AI agents"],
  authors: [{ name: "actions.engineering" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://actions.engineering'),
  openGraph: {
    title: "actions.engineering - Your context, everywhere. Never start over again.",
    description: "Stop losing context when switching between Claude Code, Gemini CLI, and other AI tools. Keep your entire project history alive across every conversation.",
    type: "website",
    siteName: "actions.engineering",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://actions.engineering'}/api/og`,
        width: 1200,
        height: 630,
        alt: "actions.engineering - The context layer for AI development",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "actions.engineering - Your context, everywhere. Never start over again.",
    description: "Stop losing context when switching between Claude Code, Gemini CLI, and other AI tools. Keep your entire project history alive.",
    images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://actions.engineering'}/api/og`],
    creator: "@actionsengineering",
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
      <body className="h-full antialiased">
        <QuickActionProvider>
          <ActionCompletionProvider>
            <GlobalKeyboardListener />
            {children}
            <QuickActionModal />
            <ActionCompletionModal />
          </ActionCompletionProvider>
        </QuickActionProvider>
      </body>
    </html>
  );
}