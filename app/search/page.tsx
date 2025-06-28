'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Search, ChevronRight } from 'lucide-react';
import Header from '../components/Header';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  hierarchyPath?: string[];
  done: boolean;
  similarity?: number;
  matchType: 'vector' | 'keyword' | 'hybrid';
  keywordMatches?: string[];
  highlight?: {
    title?: string;
    description?: string;
  };
}

interface SearchResponse {
  results: SearchResult[];
  metadata: {
    search_mode: string;
    total_results: number;
    performance: {
      total_time_ms: number;
      embedding_time_ms?: number;
      search_time_ms: number;
    };
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    if (abortController) {
      abortController.abort();
    }

    const newController = new AbortController();
    setAbortController(newController);
    setLoading(true);

    try {
      const response = await fetch('/api/actions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          search_mode: 'hybrid',
          limit: 20,
          include_completed: true,
        }),
        signal: newController.signal,
      });

      if (!response.ok) throw new Error('Search failed');
      
      const apiResponse = await response.json();
      if (apiResponse.success && apiResponse.data) {
        setResults(apiResponse.data.results || []);
      } else {
        setResults([]);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [abortController]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="sticky top-0 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search actions..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-lg"
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/actions/${result.id}`}
                className="block p-4 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
              >
                <div className="flex items-start gap-3">
                  {result.done && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base mb-1">
                      {result.highlight?.title ? (
                        <span dangerouslySetInnerHTML={{ __html: result.highlight.title }} />
                      ) : (
                        result.title
                      )}
                    </h3>
                    {result.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {result.highlight?.description ? (
                          <span dangerouslySetInnerHTML={{ __html: result.highlight.description }} />
                        ) : (
                          result.description
                        )}
                      </p>
                    )}
                    {result.hierarchyPath && Array.isArray(result.hierarchyPath) && result.hierarchyPath.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {result.hierarchyPath.map((segment, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="h-3 w-3" />}
                            <span className="truncate max-w-[200px]">{segment}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {result.similarity && (
                    <div className="text-sm text-muted-foreground">
                      {Math.round(result.similarity * 100)}%
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {query && !loading && results.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No results found for "{query}"
          </div>
        )}
        
        {!query && (
          <div className="text-center text-muted-foreground py-12">
            Start typing to search actions...
          </div>
        )}
      </div>
    </div>
  );
}