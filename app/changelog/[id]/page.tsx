'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChangelogItem from '@/components/ChangelogItem';
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
            href="/feed" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            View all changelog items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with navigation */}
        <div className="mb-8">
          <Link 
            href="/feed" 
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Changelog
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Changelog Item</h1>
          <p className="text-gray-600">Completed action with full context</p>
        </div>

        {/* Changelog Item */}
        <ChangelogItem item={changelogItem} />

        {/* Share section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Share this changelog item</p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}