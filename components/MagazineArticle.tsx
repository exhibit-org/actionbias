'use client';

import { useState } from 'react';
import { Share, Check, Calendar, Clock, Eye } from 'react-feather';

interface MagazineArticleProps {
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

export default function MagazineArticle({ 
  item, 
  showShare = false 
}: { 
  item: MagazineArticleProps; 
  showShare?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (text: string, className: string = '') => {
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ 
          __html: text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p class="mb-4">')
            .replace(/$/, '</p>')
        }}
      />
    );
  };

  // Use AI-generated headline if available, otherwise fall back to action title
  const displayHeadline = item.headline || item.actionTitle;
  const displayDeck = item.deck || item.actionDescription || item.actionVision;

  // Calculate read time based on content length
  const totalWords = [
    item.implementationStory,
    item.impactStory,
    item.learningStory
  ].filter(Boolean).join(' ').split(' ').length;
  const readTime = Math.max(1, Math.ceil(totalWords / 200));

  return (
    <article className="bg-white min-h-screen">
      {/* Magazine Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold tracking-tight">ActionBias</div>
            <div className="text-sm text-gray-500 uppercase tracking-widest">Engineering Journal</div>
          </div>
        </div>
      </header>

      {/* Article Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category/Section */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
            item.changelogVisibility === 'public' 
              ? 'bg-green-100 text-green-800'
              : item.changelogVisibility === 'team'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {item.changelogVisibility} · Engineering Update
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 tracking-tight">
          {displayHeadline}
        </h1>

        {/* Deck/Standfirst */}
        {displayDeck && (
          <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed mb-8 font-light">
            {displayDeck}
          </p>
        )}

        {/* Byline and metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <time dateTime={item.completionTimestamp}>
              {formatDate(item.completionTimestamp)}
            </time>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{readTime} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="capitalize">{item.changelogVisibility} visibility</span>
          </div>
          {showShare && (
            <button
              onClick={handleShare}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
              aria-label="Share article"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Share className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Article Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Lead/Introduction */}
            {item.impactStory && (
              <div className="mb-12">
                <div className="text-lg leading-relaxed first-letter:text-7xl first-letter:font-bold first-letter:mr-3 first-letter:float-left">
                  {renderMarkdown(item.impactStory, "prose prose-lg max-w-none")}
                </div>
              </div>
            )}

            {/* Pull Quote 1 */}
            {item.pullQuotes && item.pullQuotes.length > 0 && (
              <blockquote className="my-12 pl-6 border-l-4 border-gray-900">
                <p className="text-2xl font-light italic text-gray-700 leading-relaxed">
                  "{item.pullQuotes[0]}"
                </p>
              </blockquote>
            )}

            {/* Implementation Story */}
            {item.implementationStory && (
              <section className="mb-12">
                <h2 className="text-3xl font-bold mb-6 tracking-tight">The Implementation</h2>
                {renderMarkdown(item.implementationStory, "prose prose-lg max-w-none text-gray-700")}
              </section>
            )}

            {/* Pull Quote 2 */}
            {item.pullQuotes && item.pullQuotes.length > 1 && (
              <blockquote className="my-12 text-center">
                <p className="text-3xl font-light italic text-gray-700 leading-relaxed">
                  "{item.pullQuotes[1]}"
                </p>
              </blockquote>
            )}

            {/* Learning Story */}
            {item.learningStory && (
              <section className="mb-12">
                <h2 className="text-3xl font-bold mb-6 tracking-tight">Key Learnings</h2>
                {renderMarkdown(item.learningStory, "prose prose-lg max-w-none text-gray-700")}
              </section>
            )}

            {/* Pull Quote 3 */}
            {item.pullQuotes && item.pullQuotes.length > 2 && (
              <blockquote className="my-12 pl-6 border-l-4 border-gray-900">
                <p className="text-2xl font-light italic text-gray-700 leading-relaxed">
                  "{item.pullQuotes[2]}"
                </p>
              </blockquote>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-8">
              {/* Action Details Box */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4 uppercase tracking-wider text-gray-900">Action Details</h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500 uppercase text-xs tracking-wider">Original Goal</dt>
                    <dd className="mt-1 text-gray-900">{item.actionTitle}</dd>
                  </div>
                  {item.actionVision && (
                    <div>
                      <dt className="font-medium text-gray-500 uppercase text-xs tracking-wider">Vision</dt>
                      <dd className="mt-1 text-gray-900 italic">"{item.actionVision}"</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium text-gray-500 uppercase text-xs tracking-wider">Created</dt>
                    <dd className="mt-1 text-gray-900">{formatDate(item.actionCreatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 uppercase text-xs tracking-wider">Completed</dt>
                    <dd className="mt-1 text-gray-900">
                      {formatDate(item.completionTimestamp)} at {formatTime(item.completionTimestamp)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Additional Pull Quotes */}
              {item.pullQuotes && item.pullQuotes.length > 3 && (
                <div className="bg-gray-900 text-white rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Notable Quotes</h3>
                  <div className="space-y-4">
                    {item.pullQuotes.slice(3).map((quote, index) => (
                      <p key={index} className="text-sm italic leading-relaxed">
                        "{quote}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Article Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-200">
        <div className="text-center text-sm text-gray-500">
          <p>Action ID: {item.actionId}</p>
          <p className="mt-2">© {new Date().getFullYear()} ActionBias Engineering Journal</p>
        </div>
      </footer>
    </article>
  );
}