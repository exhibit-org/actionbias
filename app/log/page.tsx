'use client';

import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import ChangelogItem from '@/components/ChangelogItem';

interface FeedItem {
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

interface FeedResponse {
  success: boolean;
  data: FeedItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function FeedPage() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
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
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '20');

      const response = await fetch(`/api/feed?${params}`);
      const data: FeedResponse = await response.json();

      if (data.success) {
        setFeedItems(data.data);
      } else {
        setError('Failed to load feed');
      }
    } catch (err) {
      setError('Error fetching feed');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-48">
        <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Action Log</h1>
          <p className="text-gray-600">Recent completed actions with their completion stories</p>
        </div>


        {/* Feed Items */}
        <div className="space-y-6">
          {feedItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-2">No completed actions found</div>
              <div className="text-sm text-gray-400">
                Complete some actions to see them appear in the feed
              </div>
            </div>
          ) : (
            feedItems.map((item) => (
              <ChangelogItem key={item.id} item={item} showLink={true} />
            ))
          )}
        </div>
      </div>
    </div>
      <Footer colors={colors} />
    </>
  );
}