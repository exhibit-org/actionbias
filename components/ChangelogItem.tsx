'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Share, Check } from 'react-feather';

interface ChangelogItemProps {
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
  // Git information
  gitCommitHash?: string;
  gitCommitMessage?: string;
  gitBranch?: string;
  gitCommitAuthor?: string;
  gitCommitAuthorUsername?: string;
  gitRelatedCommits?: string[];
}

export default function ChangelogItem({ 
  item, 
  showLink = false, 
  showShare = false 
}: { 
  item: ChangelogItemProps; 
  showLink?: boolean;
  showShare?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="flex flex-col items-end gap-2 mt-2 sm:mt-0 sm:ml-4">
          {/* Share button */}
          {showShare && (
            <button
              onClick={handleShare}
              className="group flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
              aria-label="Share changelog item"
            >
              {copied && (
                <span className="text-sm text-green-600 font-medium">
                  Link copied!
                </span>
              )}
              {copied ? (
                <Check 
                  className="w-6 h-6 text-green-600 scale-110 transition-all duration-300" 
                />
              ) : (
                <Share 
                  className="w-6 h-6 text-gray-600 group-hover:text-gray-800 transition-all duration-300" 
                />
              )}
            </button>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-2">
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
          
          {/* Action metadata */}
          <div className="text-xs text-gray-500 text-right">
            <div>Action ID: {item.actionId}</div>
            <div>Created: {formatDate(item.actionCreatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Git information */}
      {item.gitCommitHash && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <a 
                href={`https://github.com/exhibit-org/actionbias/commit/${item.gitCommitHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-blue-600 hover:text-blue-800"
              >
                {item.gitCommitHash.substring(0, 7)}
              </a>
              {item.gitBranch && (
                <span className="text-sm text-gray-600">
                  on <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">{item.gitBranch}</span>
                </span>
              )}
              {item.gitCommitAuthor && (
                <span className="text-sm text-gray-600">
                  by{' '}
                  <a 
                    href={`https://github.com/${item.gitCommitAuthorUsername || 'bbn'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {item.gitCommitAuthor.split(' <')[0]}
                  </a>
                </span>
              )}
            </div>
            {item.gitCommitMessage && (
              <div className="text-sm text-gray-700 mt-1">{item.gitCommitMessage}</div>
            )}
            {item.gitRelatedCommits && item.gitRelatedCommits.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                +{item.gitRelatedCommits.length} related commit{item.gitRelatedCommits.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Footer - only show link if needed */}
      {showLink && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link 
            href={`/log/${item.actionId}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View shareable page →
          </Link>
        </div>
      )}
    </div>
  );
}