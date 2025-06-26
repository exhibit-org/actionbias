'use client';

import { useState } from 'react';
import MagazineArticle from '@/components/MagazineArticle';
import ChangelogItem from '@/components/ChangelogItem';
import Footer from '@/app/components/Footer';

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
  headline?: string;
  deck?: string;
  pullQuotes?: string[];
}

interface Action {
  id: string;
  title: string;
  description?: string;
  vision?: string;
}

interface ScopedLogPageClientProps {
  rootAction: Action;
  completedActions: FeedItem[];
}

export default function ScopedLogPageClient({
  rootAction,
  completedActions
}: ScopedLogPageClientProps) {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  // Color scheme to match the rest of the app
  const colors = {
    border: '#e5e7eb',
    text: '#111827',
    textMuted: '#4b5563',
    textSubtle: '#6b7280',
    textFaint: '#9ca3af'
  };

  // If there's only one completed action, show it in magazine format
  if (completedActions.length === 1) {
    return <MagazineArticle item={completedActions[0]} />;
  }

  // If an item is selected, show it in magazine format
  if (selectedItem) {
    return (
      <div>
        <button
          onClick={() => setSelectedItem(null)}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          ← Back to list
        </button>
        <MagazineArticle item={selectedItem} />
      </div>
    );
  }

  // Otherwise show a list of completed actions
  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-48">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {rootAction.title} - Completion Log
            </h1>
            <p className="text-gray-600">
              {completedActions.length === 0 
                ? 'No completed actions in this subtree yet'
                : `${completedActions.length} completed action${completedActions.length === 1 ? '' : 's'} in this subtree`
              }
            </p>
          </div>

          {/* Feed Items */}
          <div className="space-y-6">
            {completedActions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-2">No completed actions found</div>
                <div className="text-sm text-gray-400">
                  Complete some actions in this subtree to see them appear here
                </div>
              </div>
            ) : (
              completedActions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="cursor-pointer transition-transform hover:scale-[1.01]"
                >
                  <ChangelogItem item={item} showLink={false} />
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