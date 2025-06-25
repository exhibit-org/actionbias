'use client';

import { useState } from 'react';
import MagazineArticle from '@/components/MagazineArticle';
import ViralFooter from '../../components/ViralFooter';

interface ChangelogData {
  id: string;
  actionId: string;
  implementationStory?: string;
  impactStory?: string;
  learningStory?: string;
  headline?: string;
  deck?: string;
  pullQuotes?: string[] | null;
  changelogVisibility: string;
  completionTimestamp: string;
  actionTitle: string;
  actionDescription?: string;
  actionVision?: string;
  actionDone: boolean;
  actionCreatedAt: string;
}

interface ChangelogPageClientProps {
  initialData: ChangelogData;
  actionId: string;
}

export default function ChangelogPageClient({ initialData }: ChangelogPageClientProps) {
  const [changelogItem] = useState<ChangelogData>(initialData);

  // Color scheme to match the rest of the app
  const colors = {
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#4b5563',
    textSubtle: '#6b7280',
    textFaint: '#9ca3af'
  };

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: changelogItem.actionTitle,
    description: changelogItem.actionDescription || changelogItem.impactStory,
    datePublished: changelogItem.completionTimestamp,
    dateModified: changelogItem.completionTimestamp,
    author: {
      '@type': 'Organization',
      name: 'ActionBias',
      url: 'https://www.actionbias.ai'
    },
    publisher: {
      '@type': 'Organization', 
      name: 'ActionBias',
      url: 'https://www.actionbias.ai'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MagazineArticle item={changelogItem} showShare={true} />
      <ViralFooter colors={colors} />
    </>
  );
}