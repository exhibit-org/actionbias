'use client';

import Link from 'next/link';

interface ChangelogItemProps {
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

export default function ChangelogItem({ item, showLink = false }: { item: ChangelogItemProps; showLink?: boolean }) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Action ID: {item.actionId}</span>
          <span>Created: {formatDate(item.actionCreatedAt)}</span>
        </div>
        {showLink && (
          <div className="mt-2">
            <Link 
              href={`/changelog/${item.actionId}`}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View shareable page →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}