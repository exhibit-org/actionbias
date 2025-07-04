'use client';

import { useState } from 'react';
import { Share, Check, Terminal, GitCommit, Calendar, Clock } from 'react-feather';

interface EngineeringTemplateProps {
  id: string;
  actionId: string;
  templateContent?: {
    engineering?: {
      headline?: string;
      deck?: string;
      implementation_story?: string;
      impact_story?: string;
      pull_quotes?: string[];
      importance?: 'high' | 'medium' | 'low';
    };
  };
  // Fallback content from existing editorial system
  implementationStory?: string;
  impactStory?: string;
  learningStory?: string;
  headline?: string;
  deck?: string;
  pullQuotes?: string[];
  changelogVisibility: string;
  completionTimestamp: string;
  actionTitle: string;
  actionDescription?: string;
  actionVision?: string;
  actionDone: boolean;
  actionCreatedAt: string;
  // Git context information
  gitContext?: {
    commits?: Array<{
      hash?: string;
      shortHash?: string;
      message: string;
      author?: {
        name: string;
        email?: string;
        username?: string;
      };
      timestamp?: string;
      branch?: string;
      repository?: string;
      stats?: {
        filesChanged?: number;
        insertions?: number;
        deletions?: number;
        files?: string[];
      };
    }>;
    pullRequests?: Array<{
      number?: number;
      title: string;
      url?: string;
      repository?: string;
      author?: {
        name?: string;
        username?: string;
      };
      state?: 'open' | 'closed' | 'merged' | 'draft';
      merged?: boolean;
      mergedAt?: string;
      branch?: {
        head: string;
        base: string;
      };
    }>;
    repositories?: Array<{
      name: string;
      url?: string;
      platform?: 'github' | 'gitlab' | 'other';
    }>;
  };
}

export default function EngineeringTemplate({ 
  item, 
  showShare = false 
}: { 
  item: EngineeringTemplateProps; 
  showShare?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const renderTerminalContent = (text: string) => {
    // Enhanced markdown rendering with terminal-style formatting
    const paragraphs = text.split(/\n\n+/);
    
    const processedText = paragraphs.map(paragraph => {
      const processed = paragraph
        // Code blocks - Terminal style with better contrast
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '</p><pre class="bg-gray-800 border border-green-500 text-green-300 p-4 overflow-x-auto my-4 font-mono text-sm rounded"><code>$2</code></pre><p class="mb-4 font-mono">')
        // Inline code - Terminal style with better contrast
        .replace(/`([^`]+)`/g, '<code class="bg-gray-800 border border-gray-600 text-green-300 px-2 py-1 rounded font-mono text-sm">$1</code>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
        // Italic  
        .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-green-500 hover:text-green-400 underline" target="_blank" rel="noopener noreferrer">$1</a>')
        // Line breaks within paragraphs
        .replace(/\n/g, '<br>');
      
      return `<p class="mb-4 font-mono text-gray-300">${processed}</p>`;
    }).join('')
    // Clean up empty paragraphs and fix pre blocks
    .replace(/<p class="mb-4 font-mono text-gray-300"><\/p>/g, '')
    .replace(/<p class="mb-4 font-mono text-gray-300">(<\/p>)?<pre>/g, '<pre>')
    .replace(/<\/pre>(<p class="mb-4 font-mono text-gray-300">)?<\/p>/g, '</pre>');

    return (
      <div 
        className="terminal-content"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  };

  // Get engineering-specific content with smart fallbacks
  const engineering = item.templateContent?.engineering;
  
  // Use rich existing content as fallback when template content is poor
  const hasRichEngineeringContent = engineering?.implementation_story && 
    engineering.implementation_story !== "Technical implementation completed." &&
    engineering.implementation_story.length > 50;
  
  const displayHeadline = engineering?.headline || item.headline || item.actionTitle;
  const displayDeck = engineering?.deck || item.deck || item.actionDescription || item.actionVision;

  // Calculate read time based on content length
  const totalWords = [
    engineering?.implementation_story,
    engineering?.impact_story
  ].filter(Boolean).join(' ').split(' ').length;
  const readTime = Math.max(1, Math.ceil(totalWords / 200));

  // Get importance color
  const getImportanceColor = (importance?: string) => {
    switch (importance) {
      case 'high': return 'text-green-400 border-green-500';
      case 'medium': return 'text-yellow-400 border-yellow-500';
      case 'low': return 'text-gray-400 border-gray-500';
      default: return 'text-green-400 border-green-500';
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300">
      {/* Terminal Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal size={20} className="text-green-500" />
              <span className="font-mono text-sm text-gray-300">done.engineering</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">
                technical completion
              </span>
              {showShare && (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded font-mono text-xs transition-colors"
                  aria-label="Share completion"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">copied</span>
                    </>
                  ) : (
                    <>
                      <Share className="w-4 h-4" />
                      <span>share</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Terminal Prompt and Title */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        {/* Terminal prompt style */}
        <div className="mb-6">
          <span className="font-mono text-green-500">$</span>
          <span className="font-mono text-gray-500 ml-2">done</span>
          <span className="font-mono text-gray-600 ml-2">show</span>
          <span className="font-mono text-gray-600 ml-2">"{item.actionTitle}"</span>
        </div>
        
        {/* Status and metadata */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center space-x-4 font-mono text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">status:</span>
              <span className="text-green-500">✓ complete</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">visibility:</span>
              <span className="text-yellow-400">{item.changelogVisibility}</span>
            </div>
            {engineering?.importance && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">priority:</span>
                <span className={getImportanceColor(engineering.importance).split(' ')[0]}>
                  {engineering.importance}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4 font-mono text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>completed {formatDate(item.completionTimestamp)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={12} />
              <span>{readTime}min read</span>
            </div>
          </div>
        </div>

        {/* Title - Terminal style */}
        <h1 className="font-mono text-2xl md:text-3xl text-white mb-4 leading-tight">
          {displayHeadline}
        </h1>
        
        {/* Summary */}
        {displayDeck && (
          <div className="mb-8 border-l-2 border-green-500 pl-4">
            <p className="font-mono text-gray-400 leading-relaxed">
              {displayDeck}
            </p>
          </div>
        )}
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8">
            {/* Impact Summary */}
            {(engineering?.impact_story || item.impactStory) && (
              <div className="mb-10">
                <h2 className="font-mono text-lg text-green-500 mb-4">
                  <span className="text-green-500">## </span>Impact Summary
                </h2>
                <div className="bg-gray-900 border border-gray-800 rounded p-6">
                  {renderTerminalContent(
                    (hasRichEngineeringContent ? engineering!.impact_story : item.impactStory || engineering?.impact_story) || ''
                  )}
                </div>
              </div>
            )}

            {/* Key Insight */}
            {((engineering?.pull_quotes && engineering.pull_quotes.length > 0) || item.pullQuotes) && (
              <div className="my-10 bg-gray-900 border-l-4 border-green-500 pl-6 pr-6 py-4">
                <p className="font-mono text-xs text-green-500 mb-2 uppercase tracking-wider">
                  key insight
                </p>
                <p className="font-mono text-lg text-white leading-relaxed">
                  "{
                    (hasRichEngineeringContent && engineering?.pull_quotes?.[0]) || 
                    (item.pullQuotes && item.pullQuotes[0]) || 
                    engineering?.pull_quotes?.[0] || 
                    'Technical implementation completed successfully'
                  }"
                </p>
              </div>
            )}

            {/* Technical Implementation */}
            {(engineering?.implementation_story || item.implementationStory) && (
              <section className="mb-10">
                <h2 className="font-mono text-lg text-green-500 mb-4">
                  <span className="text-green-500">## </span>Technical Implementation
                </h2>
                <div className="bg-gray-900 border border-gray-800 rounded p-6">
                  {renderTerminalContent(
                    (hasRichEngineeringContent ? engineering!.implementation_story : item.implementationStory || engineering?.implementation_story) || ''
                  )}
                </div>
              </section>
            )}

            {/* Additional Insights */}
            {(
              (hasRichEngineeringContent && engineering?.pull_quotes && engineering.pull_quotes.length > 1) || 
              (item.pullQuotes && item.pullQuotes.length > 1)
            ) && (
              <div className="space-y-4">
                {(
                  hasRichEngineeringContent 
                    ? engineering!.pull_quotes!.slice(1) 
                    : item.pullQuotes!.slice(1)
                ).map((quote, index) => (
                  <div key={index} className="bg-gray-900 border border-gray-700 rounded p-4">
                    <p className="font-mono text-xs text-gray-500 mb-2 uppercase tracking-wider">
                      insight {index + 2}
                    </p>
                    <p className="font-mono text-gray-300 leading-relaxed">
                      {quote}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technical Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* System Info */}
              <div className="bg-gray-900 border border-gray-800 rounded p-4">
                <h3 className="font-mono text-sm text-green-500 mb-4 uppercase tracking-wider">
                  System Info
                </h3>
                <dl className="space-y-3 font-mono text-xs">
                  <div className="pb-2 border-b border-gray-800">
                    <dt className="text-gray-500 mb-1">action_id</dt>
                    <dd className="text-gray-300 break-all">{item.actionId}</dd>
                  </div>
                  <div className="pb-2 border-b border-gray-800">
                    <dt className="text-gray-500 mb-1">objective</dt>
                    <dd className="text-gray-300">{item.actionTitle}</dd>
                  </div>
                  {item.actionVision && (
                    <div className="pb-2 border-b border-gray-800">
                      <dt className="text-gray-500 mb-1">vision</dt>
                      <dd className="text-gray-300">{item.actionVision}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div>
                      <dt className="text-gray-500 mb-1">started</dt>
                      <dd className="text-gray-300">{formatDate(item.actionCreatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 mb-1">completed</dt>
                      <dd className="text-gray-300">{formatDate(item.completionTimestamp)}</dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Git Context */}
              {item.gitContext?.commits && item.gitContext.commits.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded p-4">
                  <h3 className="font-mono text-sm text-green-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <GitCommit size={16} />
                    Git Activity
                  </h3>
                  <div className="space-y-3 font-mono text-xs">
                    {item.gitContext.commits.map((commit, index) => (
                      <div key={commit.hash || index} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">●</span>
                          {commit.hash && (
                            <a 
                              href={`https://github.com/exhibit-org/actionbias/commit/${commit.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300"
                            >
                              {commit.shortHash || commit.hash.substring(0, 7)}
                            </a>
                          )}
                          {commit.branch && (
                            <span className="text-gray-500">on {commit.branch}</span>
                          )}
                        </div>
                        <p className="text-gray-300 pl-4">{commit.message}</p>
                        {commit.author && (
                          <p className="text-gray-500 pl-4">
                            by{' '}
                            {commit.author.username ? (
                              <a 
                                href={`https://github.com/${commit.author.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-400 hover:text-green-300"
                              >
                                {commit.author.name}
                              </a>
                            ) : (
                              <span className="text-green-400">{commit.author.name}</span>
                            )}
                          </p>
                        )}
                        {commit.stats && (
                          <div className="text-gray-500 pl-4 space-y-1">
                            {commit.stats.filesChanged && (
                              <div>{commit.stats.filesChanged} files changed</div>
                            )}
                            {(commit.stats.insertions || commit.stats.deletions) && (
                              <div>
                                {commit.stats.insertions && <span className="text-green-400">+{commit.stats.insertions}</span>}
                                {commit.stats.insertions && commit.stats.deletions && ' '}
                                {commit.stats.deletions && <span className="text-red-400">-{commit.stats.deletions}</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {item.gitContext.pullRequests && item.gitContext.pullRequests.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-800">
                        <div className="text-gray-500 mb-2">Pull Requests:</div>
                        {item.gitContext.pullRequests.map((pr, index) => (
                          <div key={pr.number || index} className="text-gray-300">
                            {pr.url ? (
                              <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                                {pr.title}
                              </a>
                            ) : (
                              pr.title
                            )}
                            {pr.state && <span className="ml-2 text-gray-500">({pr.state})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Terminal Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 mt-12 border-t border-gray-800">
        <div className="flex justify-between items-center font-mono text-xs text-gray-600">
          <div>
            <p className="break-all">ref: {item.actionId}</p>
            <p className="mt-1">© {new Date().getFullYear()} done.engineering</p>
          </div>
          <div className="text-right">
            <p className="text-green-500">engineering completion</p>
            <p className="mt-1">technical deep-dive</p>
          </div>
        </div>
      </footer>
    </div>
  );
}