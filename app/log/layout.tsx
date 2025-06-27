import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Action Log - done.engineering',
  description: 'Browse completed actions and their stories. See how dreams transform into executed reality through our changelog.',
  openGraph: {
    title: 'Action Log - done.engineering',
    description: 'Browse completed actions and their stories. See how dreams transform into executed reality.',
    type: 'website',
    siteName: 'done.engineering',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Action Log - done.engineering',
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