import "./globals.css";
import type { Metadata } from "next";
import { QuickActionProvider } from "./contexts/QuickActionContext";
import QuickActionModal from "./components/QuickActionModal";
import GlobalKeyboardListener from "./components/GlobalKeyboardListener";

export const metadata: Metadata = {
  title: "done.engineering - Your context, everywhere. Never start over again.",
  description: "The context layer for AI development. Keep your entire project history alive across Claude Code, Gemini CLI, and every AI tool. Done is the engine of more.",
  keywords: ["Claude Code", "Gemini CLI", "AI context", "MCP", "Model Context Protocol", "AI development", "context persistence", "AI agents"],
  authors: [{ name: "done.engineering" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://done.engineering'),
  openGraph: {
    title: "done.engineering - Your context, everywhere. Never start over again.",
    description: "Stop losing context when switching between Claude Code, Gemini CLI, and other AI tools. Keep your entire project history alive across every conversation.",
    type: "website",
    siteName: "done.engineering",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://done.engineering'}/api/og`,
        width: 1200,
        height: 630,
        alt: "done.engineering - The context layer for AI development",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "done.engineering - Your context, everywhere. Never start over again.",
    description: "Stop losing context when switching between Claude Code, Gemini CLI, and other AI tools. Keep your entire project history alive.",
    images: [`${process.env.NEXT_PUBLIC_BASE_URL || 'https://done.engineering'}/api/og`],
    creator: "@doneengineering",
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
          <GlobalKeyboardListener />
          {children}
          <QuickActionModal />
        </QuickActionProvider>
      </body>
    </html>
  );
}