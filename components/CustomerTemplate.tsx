'use client';

import React, { useState } from 'react';
import { Share, Check, Star, Users, Zap } from 'react-feather';

interface CustomerTemplateProps {
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
      customer?: {
        headline?: string;
        announcement?: string;
        feature_highlights?: string;
        user_benefits?: string;
        pull_quotes?: string[];
        importance?: 'high' | 'medium' | 'low';
      };
    };
    // Git context for simplified customer metrics
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

export default function CustomerTemplate({ item, showShare = false }: CustomerTemplateProps) {
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

  // Enhanced markdown rendering for customer-friendly content
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
          <ul key={elements.length} className="mb-4 space-y-2 text-gray-700">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start">
                <Star className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
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
          <h2 key={elements.length} className="text-2xl font-bold mb-4 mt-8 text-gray-900">
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
          <h1 key={elements.length} className="text-3xl font-bold mb-6 mt-8 text-gray-900">
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

  // Get customer content from template content
  const customerContent = item.templateContent?.customer;
  
  // Debug logging
  console.log('CustomerTemplate - item.templateContent:', item.templateContent);
  console.log('CustomerTemplate - customerContent:', customerContent);
  
  // Fallback to action details if no customer template content
  const displayHeadline = customerContent?.headline || item.actionTitle;
  const displayAnnouncement = customerContent?.announcement || item.actionDescription || item.actionVision;
  const featureHighlights = customerContent?.feature_highlights || '';
  const userBenefits = customerContent?.user_benefits || '';
  const pullQuotes = customerContent?.pull_quotes || [];

  // Calculate simplified customer metrics
  const totalChanges = item.gitContext?.commits?.reduce((total, commit) => {
    return total + (commit.stats?.insertions || 0) + (commit.stats?.deletions || 0);
  }, 0) || 0;

  const filesChanged = item.gitContext?.commits?.reduce((total, commit) => {
    return total + (commit.stats?.filesChanged || 0);
  }, 0) || 0;

  // Calculate read time for customer content
  const customerWordCount = [featureHighlights, userBenefits].filter(Boolean).join(' ').split(' ').length;
  const readTime = Math.max(1, Math.ceil(customerWordCount / 200));

  return (
    <article className="bg-white min-h-screen">
      {/* Customer Header - Friendly and Welcoming */}
      <header className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold">done.engineering</div>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="text-sm font-medium uppercase tracking-wider">What's New</div>
            </div>
            <div className="text-xs uppercase tracking-widest font-medium">Feature Update</div>
          </div>
        </div>
      </header>

      {/* Article Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category/Section */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            item.changelogVisibility === 'public' 
              ? 'bg-green-100 text-green-800'
              : item.changelogVisibility === 'team'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            <Users className="w-4 h-4 mr-1" />
            {item.changelogVisibility === 'public' ? 'Public Release' : 
             item.changelogVisibility === 'team' ? 'Team Update' : 
             'Internal Update'}
          </span>
          {customerContent?.importance && (
            <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              customerContent.importance === 'high' ? 'bg-red-100 text-red-800' :
              customerContent.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <Zap className="w-4 h-4 mr-1" />
              {customerContent.importance === 'high' ? 'Major Update' :
               customerContent.importance === 'medium' ? 'Enhancement' :
               'Minor Update'}
            </span>
          )}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6 text-gray-900">
          {displayHeadline}
        </h1>

        {/* Announcement/Standfirst */}
        {displayAnnouncement && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <p className="text-lg sm:text-xl text-blue-900 leading-relaxed font-medium">
              {displayAnnouncement}
            </p>
          </div>
        )}

        {/* Byline and metadata */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 py-4 border-t border-b border-gray-200">
          <div className="flex items-center gap-2">
            <time dateTime={item.completionTimestamp} className="font-medium">
              {formatDate(item.completionTimestamp)}
            </time>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <span>{readTime} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Release:</span>
            <span className="capitalize font-medium">{item.changelogVisibility}</span>
          </div>
          {showShare && (
            <button
              onClick={handleShare}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors duration-200"
              aria-label="Share update"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Share className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Share</span>
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
            {/* Feature Highlights */}
            {featureHighlights && (
              <div className="mb-10">
                <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  What's New
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="text-base leading-relaxed text-gray-800">
                    {renderMarkdown(featureHighlights)}
                  </div>
                </div>
              </div>
            )}

            {/* Key Highlight Pull Quote */}
            {pullQuotes && pullQuotes.length > 0 && (
              <div className="my-10 bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-blue-400 pl-6 pr-6 py-6 rounded-r-lg">
                <div className="flex items-start">
                  <Zap className="w-6 h-6 text-blue-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Key Benefit</p>
                    <p className="text-xl font-medium text-gray-800 leading-relaxed">
                      {pullQuotes[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Benefits */}
            {userBenefits && (
              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center">
                  <Users className="w-6 h-6 mr-2 text-green-500" />
                  How This Helps You
                </h2>
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  {renderMarkdown(userBenefits)}
                </div>
              </section>
            )}

            {/* Additional Benefits */}
            {pullQuotes && pullQuotes.length > 1 && (
              <div className="my-10 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start">
                  <Star className="w-6 h-6 text-yellow-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-yellow-700 mb-2">Additional Benefit</p>
                    <p className="text-lg font-medium text-gray-800 leading-relaxed">
                      {pullQuotes[1]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* More Improvements */}
            {pullQuotes && pullQuotes.length > 2 && (
              <div className="my-10 bg-gray-50 rounded-lg p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">More Improvements</p>
                <p className="text-lg font-medium text-gray-800 leading-relaxed">
                  {pullQuotes[2]}
                </p>
              </div>
            )}
          </div>

          {/* Customer Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Update Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-500" />
                  Update Summary
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="border-b border-gray-200 pb-3">
                    <dt className="font-medium text-gray-600 uppercase text-xs tracking-wider mb-1">Feature</dt>
                    <dd className="text-gray-900 font-medium">{item.actionTitle}</dd>
                  </div>
                  {item.actionVision && (
                    <div className="border-b border-gray-200 pb-3">
                      <dt className="font-medium text-gray-600 uppercase text-xs tracking-wider mb-1">Goal</dt>
                      <dd className="text-gray-900">{item.actionVision}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 pt-2">
                    <div>
                      <dt className="font-medium text-gray-600 uppercase text-xs tracking-wider mb-1">Released</dt>
                      <dd className="text-gray-900 font-medium">{formatDate(item.completionTimestamp)}</dd>
                    </div>
                  </div>
                  
                  {/* Simplified Customer Metrics */}
                  {(totalChanges > 0 || filesChanged > 0) && (
                    <div className="pt-3 mt-3 border-t border-gray-200">
                      <dt className="font-medium text-gray-600 uppercase text-xs tracking-wider mb-2">Development</dt>
                      <dd className="space-y-2">
                        {filesChanged > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Files Updated:</span>
                            <span className="font-medium text-gray-900">{filesChanged}</span>
                          </div>
                        )}
                        {totalChanges > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Code Changes:</span>
                            <span className="font-medium text-gray-900">{totalChanges.toLocaleString()}</span>
                          </div>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Additional Customer Benefits */}
              {pullQuotes && pullQuotes.length > 3 && (
                <div className="bg-gradient-to-br from-blue-500 to-green-500 text-white rounded-lg p-5">
                  <h3 className="text-lg font-bold mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    More Benefits
                  </h3>
                  <div className="space-y-3">
                    {pullQuotes.slice(3).map((quote, index) => (
                      <div key={index} className="border-l-2 border-white/30 pl-3">
                        <p className="text-sm leading-relaxed">
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
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>
            <p className="font-medium">Update ID: {item.actionId}</p>
            <p className="mt-1">© {new Date().getFullYear()} done.engineering</p>
          </div>
          <div className="text-right">
            <p className="font-medium uppercase tracking-wider">Feature Update</p>
            <p className="mt-1">Customer Communication</p>
          </div>
        </div>
      </footer>
    </article>
  );
}