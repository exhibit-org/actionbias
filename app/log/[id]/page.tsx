'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChangelogItem from '@/components/ChangelogItem';
import ViralFooter from '../../components/ViralFooter';
import Link from 'next/link';

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

interface ChangelogResponse {
  success: boolean;
  data: ChangelogData;
}

export default function ChangelogItemPage() {
  const params = useParams();
  const actionId = params.id as string;
  
  const [changelogItem, setChangelogItem] = useState<ChangelogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Color scheme to match the rest of the app
  const colors = {
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#4b5563',
    textSubtle: '#6b7280',
    textFaint: '#9ca3af'
  };

  useEffect(() => {
    fetchChangelogItem();
  }, [actionId]);

  const fetchChangelogItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/changelog/${actionId}`);
      const data: ChangelogResponse = await response.json();

      if (data.success) {
        setChangelogItem(data.data);
      } else {
        setError('Changelog item not found');
      }
    } catch (err) {
      setError('Error fetching changelog item');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !changelogItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Changelog item not found'}</div>
          <Link 
            href="/log" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View all log items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
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