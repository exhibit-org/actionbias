'use client';

import { useState } from 'react';
import ChangelogItem from '@/components/ChangelogItem';
import ViralFooter from '../../components/ViralFooter';

interface ChangelogData {
  id: string;
  actionId: string;
  implementationStory?: string;
  impactStory?: string;
  learningStory?: string;
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
      url: 'https://actionbias.com'
    },
    publisher: {
      '@type': 'Organization', 
      name: 'ActionBias',
      url: 'https://actionbias.com'
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-gray-50 pb-80">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Changelog Item with share button */}
          <ChangelogItem item={changelogItem} showShare={true} />
        </div>
      </div>
      <ViralFooter colors={colors} />
    </>
  );
}