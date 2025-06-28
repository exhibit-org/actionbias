'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from './SearchContext';
import { CheckCircle2, Loader2, Search, ChevronRight } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  path: string[];
  done: boolean;
  similarity?: number;
  match_type: 'vector' | 'keyword' | 'hybrid';
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

export function SearchModal() {
  const router = useRouter();
  const { isOpen, closeSearch } = useSearch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const response = await fetch('/api/actions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          search_mode: 'hybrid',
          limit: 10,
          include_completed: false,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Search failed');
      
      const data: SearchResponse = await response.json();
      setResults(data.results);
      setSelectedIndex(0);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(`/actions/${results[selectedIndex].id}`);
      closeSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh]"
      onClick={closeSearch}
    >
      <div 
        className="w-full max-w-2xl rounded-lg bg-background shadow-lg border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border p-4">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <kbd className="ml-3 hidden sm:inline-block text-xs bg-muted px-2 py-1 rounded">ESC</kbd>
        </div>
        
        {results.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={result.id}
                onClick={() => {
                  router.push(`/actions/${result.id}`);
                  closeSearch();
                }}
                className={`w-full text-left px-4 py-3 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors ${
                  index === selectedIndex ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.done && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {result.highlight?.title ? (
                        <span dangerouslySetInnerHTML={{ __html: result.highlight.title }} />
                      ) : (
                        result.title
                      )}
                    </div>
                    {result.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.highlight?.description ? (
                          <span dangerouslySetInnerHTML={{ __html: result.highlight.description }} />
                        ) : (
                          result.description
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      {result.path.map((segment, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="h-3 w-3" />}
                          <span className="truncate max-w-[150px]">{segment}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  {result.similarity && (
                    <div className="text-xs text-muted-foreground">
                      {Math.round(result.similarity * 100)}%
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        
        {query && !loading && results.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No results found for "{query}"
          </div>
        )}
        
        {!query && (
          <div className="p-8 text-center text-muted-foreground">
            Start typing to search actions...
          </div>
        )}
      </div>
    </div>
  );
}