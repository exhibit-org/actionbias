import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Action Log - ActionBias',
  description: 'Browse completed actions and their stories. See how dreams transform into executed reality through our changelog.',
  openGraph: {
    title: 'Action Log - ActionBias',
    description: 'Browse completed actions and their stories. See how dreams transform into executed reality.',
    type: 'website',
    siteName: 'ActionBias',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Action Log - ActionBias',
    description: 'Browse completed actions and their stories. See how dreams transform into executed reality.',
  },
};

export default function LogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}