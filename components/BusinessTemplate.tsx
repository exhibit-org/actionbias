'use client';

import React, { useState } from 'react';
import { Share, Check } from 'react-feather';

interface BusinessTemplateProps {
  item: {
    id: string;
    actionId: string;
    actionTitle: string;
    actionDescription?: string;
    actionVision?: string;
    actionDone: boolean;
    actionCreatedAt: string;
    completionTimestamp: string;
    changelogVisibility: string;
    templateContent?: {
      business?: {
        headline?: string;
        deck?: string;
        impact_story?: string;
        strategic_implications?: string;
        pull_quotes?: string[];
        importance?: 'high' | 'medium' | 'low';
      };
    };
    // Git context for simplified business metrics
    gitContext?: {
      commits?: Array<{
        stats?: {
          filesChanged?: number;
          insertions?: number;
          deletions?: number;
        };
      }>;
    };
  };
  showShare?: boolean;
}

export default function BusinessTemplate({ item, showShare = false }: BusinessTemplateProps) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Enhanced markdown rendering specifically for business content
  const renderMarkdown = (text: string) => {
    if (!text) return <div></div>;

    // Process the text line by line to handle markdown properly
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let inList = false;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
        
        elements.push(
          <p key={elements.length} className="mb-4 text-gray-700 leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: paragraphText }} />
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className="mb-4 space-y-1 text-gray-700">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                <span dangerouslySetInnerHTML={{ 
                  __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>') 
                }} />
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        if (inList) {
          flushList();
        } else {
          flushParagraph();
        }
        return;
      }

      // Handle headers
      if (trimmedLine.startsWith('## ')) {
        flushParagraph();
        flushList();
        const headerText = trimmedLine.substring(3);
        elements.push(
          <h2 key={elements.length} className="text-2xl font-serif font-normal mb-4 mt-8 text-gray-900">
            {headerText}
          </h2>
        );
        return;
      }

      if (trimmedLine.startsWith('# ')) {
        flushParagraph();
        flushList();
        const headerText = trimmedLine.substring(2);
        elements.push(
          <h1 key={elements.length} className="text-3xl font-serif font-normal mb-6 mt-8 text-gray-900">
            {headerText}
          </h1>
        );
        return;
      }

      // Handle list items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        flushParagraph();
        inList = true;
        listItems.push(trimmedLine.substring(2));
        return;
      }

      // Handle regular paragraph text
      if (inList) {
        flushList();
      }
      currentParagraph.push(trimmedLine);
    });

    // Flush any remaining content
    flushParagraph();
    flushList();

    return <div>{elements}</div>;
  };

  // Get business content from template content
  const businessContent = item.templateContent?.business;
  
  // Debug logging
  console.log('BusinessTemplate - item.templateContent:', item.templateContent);
  console.log('BusinessTemplate - businessContent:', businessContent);
  
  // Fallback to action details if no business template content
  const displayHeadline = businessContent?.headline || item.actionTitle;
  const displayDeck = businessContent?.deck || item.actionDescription || item.actionVision;
  const impactStory = businessContent?.impact_story || '';
  const strategicImplications = businessContent?.strategic_implications || '';
  const pullQuotes = businessContent?.pull_quotes || [];

  // Calculate simplified business metrics
  const totalCodeChanges = item.gitContext?.commits?.reduce((total, commit) => {
    return total + (commit.stats?.insertions || 0) + (commit.stats?.deletions || 0);
  }, 0) || 0;

  const filesChanged = item.gitContext?.commits?.reduce((total, commit) => {
    return total + (commit.stats?.filesChanged || 0);
  }, 0) || 0;

  // Calculate read time for business content
  const businessWordCount = [impactStory, strategicImplications].filter(Boolean).join(' ').split(' ').length;
  const readTime = Math.max(1, Math.ceil(businessWordCount / 200));

  return (
    <article className="bg-white min-h-screen">
      {/* Business Header - Economist Style */}
      <header className="border-b-2 border-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-serif tracking-tight text-gray-900">done.engineering</div>
              <div className="w-px h-6 bg-gray-400"></div>
              <div className="text-sm font-medium text-red-600 uppercase tracking-wider">Business Intelligence</div>
            </div>
            <div className="text-xs text-gray-600 uppercase tracking-widest font-medium">Strategic Analysis</div>
          </div>
        </div>
      </header>

      {/* Article Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category/Section */}
        <div className="mb-4">
          <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider ${
            item.changelogVisibility === 'public' 
              ? 'text-red-700'
              : item.changelogVisibility === 'team'
              ? 'text-blue-700'
              : 'text-gray-700'
          }`}>
            {item.changelogVisibility === 'public' ? 'Strategic Report' : 
             item.changelogVisibility === 'team' ? 'Internal Analysis' : 
             'Confidential Assessment'} • Business Impact
          </span>
          {businessContent?.importance && (
            <span className={`ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              businessContent.importance === 'high' ? 'bg-red-100 text-red-800' :
              businessContent.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {businessContent.importance.toUpperCase()} PRIORITY
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-serif font-normal leading-tight mb-4 text-gray-900">
          {displayHeadline}
        </h1>

        {/* Deck/Standfirst */}
        {displayDeck && (
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-6 font-light border-l-3 border-red-600 pl-5">
            {displayDeck}
          </p>
        )}

        {/* Byline and metadata */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 py-4 border-t border-b border-gray-300">
          <div className="flex items-center gap-2">
            <time dateTime={item.completionTimestamp} className="font-medium">
              {formatDate(item.completionTimestamp)}
            </time>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <span>{readTime} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Impact:</span>
            <span className="capitalize font-medium">{item.changelogVisibility}</span>
          </div>
          {showShare && (
            <button
              onClick={handleShare}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
              aria-label="Share analysis"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Executive Summary */}
            {impactStory && (
              <div className="mb-10">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3">Business Impact</h3>
                <div className="text-base leading-relaxed text-gray-800 font-serif first-letter:text-6xl first-letter:font-bold first-letter:mr-2 first-letter:float-left first-letter:leading-none">
                  {renderMarkdown(impactStory)}
                </div>
              </div>
            )}

            {/* Key Finding */}
            {pullQuotes && pullQuotes.length > 0 && (
              <div className="my-10 bg-gray-50 border-l-4 border-red-600 pl-6 pr-6 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Key Finding</p>
                <p className="text-xl font-serif italic text-gray-800 leading-relaxed">
                  {pullQuotes[0]}
                </p>
              </div>
            )}

            {/* Strategic Implications */}
            {strategicImplications && (
              <section className="mb-10">
                <h2 className="text-2xl font-serif font-normal mb-4 text-gray-900">Strategic Implications</h2>
                <div className="border-t-2 border-gray-200 pt-4">
                  {renderMarkdown(strategicImplications)}
                </div>
              </section>
            )}

            {/* Additional Insights */}
            {pullQuotes && pullQuotes.length > 1 && (
              <div className="my-10 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3">Strategic Insight</p>
                <p className="text-2xl font-serif text-gray-800 leading-relaxed">
                  {pullQuotes[1]}
                </p>
              </div>
            )}

            {/* Market Outlook */}
            {pullQuotes && pullQuotes.length > 2 && (
              <div className="my-10 bg-gray-100 rounded-lg p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Market Outlook</p>
                <p className="text-lg font-serif text-gray-800 leading-relaxed">
                  {pullQuotes[2]}
                </p>
              </div>
            )}
          </div>

          {/* Business Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Business Metrics */}
              <div className="bg-gray-50 border border-gray-200 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-4">Project Overview</h3>
                <dl className="space-y-3 text-sm">
                  <div className="border-b border-gray-200 pb-3">
                    <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Initiative</dt>
                    <dd className="text-gray-900 font-serif">{item.actionTitle}</dd>
                  </div>
                  {item.actionVision && (
                    <div className="border-b border-gray-200 pb-3">
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Objective</dt>
                      <dd className="text-gray-900 font-serif italic">{item.actionVision}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Started</dt>
                      <dd className="text-gray-900 font-medium">{formatDate(item.actionCreatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-1">Completed</dt>
                      <dd className="text-gray-900 font-medium">{formatDate(item.completionTimestamp)}</dd>
                    </div>
                  </div>
                  
                  {/* Simplified Business Metrics */}
                  {(totalCodeChanges > 0 || filesChanged > 0) && (
                    <div className="pt-3 mt-3 border-t border-gray-200">
                      <dt className="font-bold text-gray-600 uppercase text-xs tracking-wider mb-2">Delivery Metrics</dt>
                      <dd className="space-y-2">
                        {filesChanged > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Components Modified:</span>
                            <span className="font-medium text-gray-900">{filesChanged}</span>
                          </div>
                        )}
                        {totalCodeChanges > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Changes Deployed:</span>
                            <span className="font-medium text-gray-900">{totalCodeChanges.toLocaleString()}</span>
                          </div>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Additional Strategic Notes */}
              {pullQuotes && pullQuotes.length > 3 && (
                <div className="bg-blue-900 text-white p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-4">Strategic Notes</h3>
                  <div className="space-y-3">
                    {pullQuotes.slice(3).map((quote, index) => (
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

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t-2 border-gray-300">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>
            <p className="font-medium">Reference: {item.actionId}</p>
            <p className="mt-1">© {new Date().getFullYear()} done.engineering Strategic Intelligence</p>
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wider">Business Analysis</p>
            <p className="mt-1">Strategic Impact Assessment</p>
          </div>
        </div>
      </footer>
    </article>
  );
}