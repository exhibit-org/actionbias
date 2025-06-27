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
    // Enhanced markdown rendering with better code formatting
    // First, handle paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    const processedText = paragraphs.map(paragraph => {
      // Process each paragraph
      const processed = paragraph
        // Code blocks with language hint - Analytical style
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '</p><pre class="bg-gray-50 border border-gray-300 text-gray-800 p-4 overflow-x-auto my-4 font-mono text-sm"><code>$2</code></pre><p class="mb-4">')
        // Inline code - Clean analytical style
        .replace(/`([^`]+)`/g, '<code class="bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-sm font-mono text-blue-900">$1</code>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic  
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>')
        // Line breaks within paragraphs
        .replace(/\n/g, '<br>');
      
      return `<p class="mb-4">${processed}</p>`;
    }).join('')
    // Clean up empty paragraphs and fix pre blocks
    .replace(/<p class="mb-4"><\/p>/g, '')
    .replace(/<p class="mb-4">(<\/p>)?<pre>/g, '<pre>')
    .replace(/<\/pre>(<p class="mb-4">)?<\/p>/g, '</pre>');

    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: processedText }}
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
      {/* Analytical Magazine Header - Economist Style */}
      <header className="border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-serif tracking-tight text-gray-900">done.engineering</div>
              <div className="w-px h-6 bg-gray-400"></div>
              <div className="text-sm font-medium text-red-600 uppercase tracking-wider">Engineering Intelligence</div>
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-widest font-medium">Analysis & Insights</div>
          </div>
        </div>
      </header>

      {/* Article Header - Analytical Style */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category/Section - Red accent like The Economist */}
        <div className="mb-4">
          <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider ${
            item.changelogVisibility === 'public' 
              ? 'text-red-700'
              : item.changelogVisibility === 'team'
              ? 'text-blue-700'
              : 'text-gray-700'
          }`}>
            {item.changelogVisibility === 'public' ? 'Public Analysis' : 
             item.changelogVisibility === 'team' ? 'Team Intelligence' : 
             'Private Research'} • Technical Implementation
          </span>
        </div>

        {/* Headline - Economist Style */}
        <h1 className="text-4xl sm:text-5xl font-serif font-normal leading-tight mb-4 text-gray-900">
          {displayHeadline}
        </h1>

        {/* Deck/Standfirst - Analytical Summary */}
        {displayDeck && (
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-6 font-light border-l-3 border-red-600 pl-5">
            {displayDeck}
          </p>
        )}

        {/* Byline and metadata - Clean analytical style */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 py-4 border-t border-b border-gray-300">
          <div className="flex items-center gap-2">
            <time dateTime={item.completionTimestamp} className="font-medium">
              {formatDate(item.completionTimestamp)}
            </time>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <span>{readTime} minute analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Visibility:</span>
            <span className="capitalize font-medium">{item.changelogVisibility}</span>
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

      {/* Article Body - Analytical Layout */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Executive Summary / Impact Analysis */}
            {item.impactStory && (
              <div className="mb-10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3">Executive Summary</h3>
                <div className="text-base leading-relaxed text-gray-800 font-serif first-letter:text-6xl first-letter:font-bold first-letter:mr-2 first-letter:float-left first-letter:leading-none">
                  {renderMarkdown(item.impactStory, "prose prose-lg max-w-none")}
                </div>
              </div>
            )}

            {/* Key Finding 1 - Analytical Pull Quote */}
            {item.pullQuotes && item.pullQuotes.length > 0 && (
              <div className="my-10 bg-gray-50 border-l-4 border-red-600 pl-6 pr-6 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Key Finding</p>
                <p className="text-xl font-serif italic text-gray-800 leading-relaxed">
                  {item.pullQuotes[0]}
                </p>
              </div>
            )}

            {/* Technical Analysis */}
            {item.implementationStory && (
              <section className="mb-10">
                <h2 className="text-2xl font-serif font-normal mb-4 text-gray-900">Technical Analysis</h2>
                <div className="border-t-2 border-gray-200 pt-4">
                  {renderMarkdown(item.implementationStory, "prose prose-base max-w-none text-gray-700 font-serif")}
                </div>
              </section>
            )}

            {/* Data Point / Insight 2 */}
            {item.pullQuotes && item.pullQuotes.length > 1 && (
              <div className="my-10 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3">Critical Insight</p>
                <p className="text-2xl font-serif text-gray-800 leading-relaxed">
                  {item.pullQuotes[1]}
                </p>
              </div>
            )}

            {/* Strategic Implications */}
            {item.learningStory && (
              <section className="mb-10">
                <h2 className="text-2xl font-serif font-normal mb-4 text-gray-900">Strategic Implications</h2>
                <div className="border-t-2 border-gray-200 pt-4">
                  {renderMarkdown(item.learningStory, "prose prose-base max-w-none text-gray-700 font-serif")}
                </div>
              </section>
            )}

            {/* Forward Outlook */}
            {item.pullQuotes && item.pullQuotes.length > 2 && (
              <div className="my-10 bg-gray-100 rounded-lg p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Forward Outlook</p>
                <p className="text-lg font-serif text-gray-800 leading-relaxed">
                  {item.pullQuotes[2]}
                </p>
              </div>
            )}
          </div>

          {/* Analytical Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Data Box - Project Metrics */}
              <div className="bg-gray-50 border border-gray-200 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-4">Project Metrics</h3>
                <dl className="space-y-3 text-sm">
                  <div className="border-b border-gray-200 pb-3">
                    <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Objective</dt>
                    <dd className="text-gray-900 font-serif">{item.actionTitle}</dd>
                  </div>
                  {item.actionVision && (
                    <div className="border-b border-gray-200 pb-3">
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Strategic Vision</dt>
                      <dd className="text-gray-900 font-serif italic">{item.actionVision}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Initiated</dt>
                      <dd className="text-gray-900 font-medium">{formatDate(item.actionCreatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Delivered</dt>
                      <dd className="text-gray-900 font-medium">{formatDate(item.completionTimestamp)}</dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Research Notes */}
              {item.pullQuotes && item.pullQuotes.length > 3 && (
                <div className="bg-blue-900 text-white p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Research Notes</h3>
                  <div className="space-y-3">
                    {item.pullQuotes.slice(3).map((quote, index) => (
                      <div key={index} className="border-l-2 border-blue-600 pl-3">
                        <p className="text-sm font-serif leading-relaxed">
                          {quote}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Analytical Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t-2 border-gray-300">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>
            <p className="font-medium">Reference: {item.actionId}</p>
            <p className="mt-1">© {new Date().getFullYear()} done.engineering Intelligence Unit</p>
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wider">Engineering Analysis</p>
            <p className="mt-1">Technical Implementation Report</p>
          </div>
        </div>
      </footer>
    </article>
  );
}