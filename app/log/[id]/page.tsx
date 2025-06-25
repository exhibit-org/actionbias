import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChangelogPageClient from './client';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getChangelogItem(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/changelog/${id}`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching changelog item:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const changelogItem = await getChangelogItem(id);
  
  if (!changelogItem) {
    return {
      title: 'Changelog Item Not Found - ActionBias',
      description: 'The requested changelog item could not be found.',
    };
  }
  
  // Create a compelling description from the impact story or action description
  let description = changelogItem.impactStory || changelogItem.actionDescription || 'A completed action in ActionBias';
  // Truncate to ~160 characters for optimal display
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  // Clean up markdown for plain text display
  description = description
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\n/g, ' ');
  
  const title = `${changelogItem.actionTitle} - ActionBias Changelog`;
  const ogImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://actionbias.com'}/api/og/log/${id}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: changelogItem.completionTimestamp,
      authors: ['ActionBias'],
      siteName: 'ActionBias',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${changelogItem.actionTitle} - ActionBias`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ChangelogItemPage({ params }: PageProps) {
  const { id } = await params;
  const changelogItem = await getChangelogItem(id);
  
  if (!changelogItem) {
    notFound();
  }
  
  return <ChangelogPageClient initialData={changelogItem} actionId={id} />;
}