'use client';

import { useState, useEffect } from 'react';
import Footer from '../components/Footer';

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
  const [visibilityFilter, setVisibilityFilter] = useState<string>('');

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
  }, [visibilityFilter]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (visibilityFilter) {
        params.set('visibility', visibilityFilter);
      }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMarkdown = (text: string) => {
    return (
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ 
          __html: text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
            .replace(/\n/g, '<br>')
        }}
      />
    );
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Action Feed</h1>
          <p className="text-gray-600">Recent completed actions with their completion stories</p>
        </div>

        {/* Filter Controls */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setVisibilityFilter('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibilityFilter === '' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setVisibilityFilter('public')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibilityFilter === 'public' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Public
            </button>
            <button
              onClick={() => setVisibilityFilter('team')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibilityFilter === 'team' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Team
            </button>
            <button
              onClick={() => setVisibilityFilter('private')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                visibilityFilter === 'private' 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Private
            </button>
          </div>
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
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      {item.actionTitle}
                    </h2>
                    {item.actionDescription && (
                      <p className="text-gray-600 text-sm mb-2">{item.actionDescription}</p>
                    )}
                    {item.actionVision && (
                      <p className="text-blue-600 text-sm italic mb-2">"{item.actionVision}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0 sm:ml-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.changelogVisibility === 'public' 
                        ? 'bg-green-100 text-green-700'
                        : item.changelogVisibility === 'team'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.changelogVisibility}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(item.completionTimestamp)}
                    </span>
                  </div>
                </div>

                {/* Completion Stories */}
                <div className="space-y-4">
                  {item.implementationStory && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        🔧 Implementation Story
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                        {renderMarkdown(item.implementationStory)}
                      </div>
                    </div>
                  )}

                  {item.impactStory && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        🎯 Impact Story
                      </h3>
                      <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700">
                        {renderMarkdown(item.impactStory)}
                      </div>
                    </div>
                  )}

                  {item.learningStory && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        💡 Learning Story
                      </h3>
                      <div className="bg-yellow-50 rounded-lg p-4 text-sm text-gray-700">
                        {renderMarkdown(item.learningStory)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Action ID: {item.actionId}</span>
                  <span>Created: {formatDate(item.actionCreatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
      <Footer colors={colors} />
    </>
  );
}