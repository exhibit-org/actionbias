'use client';

import { useState, useEffect } from 'react';

interface ActionMetadata {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface NextActionData {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  parent_chain: ActionMetadata[];
  children: ActionMetadata[];
  dependencies: ActionMetadata[];
  dependents: ActionMetadata[];
}

export default function NextActionDisplay() {
  const [nextAction, setNextAction] = useState<NextActionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchNextAction = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch from the REST API endpoint
        const response = await fetch('/api/actions/next');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch next action');
        }

        setNextAction(data.data);
      } catch (err) {
        console.error('Error fetching next action:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch next action');
      } finally {
        setLoading(false);
      }
    };

    fetchNextAction();
  }, []);

  const markComplete = async () => {
    if (!nextAction) return;
    
    try {
      setCompleting(true);
      setError(null);
      
      // Call the REST API to update the action
      const response = await fetch(`/api/actions/${nextAction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          done: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark action as complete');
      }

      // Mark as completed and refresh after a short delay
      setCompleted(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      console.error('Error marking action complete:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark action as complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-white/20">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-3/4 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
          </div>
          <div className="mt-8 h-12 bg-gray-200 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">
              Error Loading Next Action
            </h2>
            <p className="text-red-600 text-sm sm:text-base mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!nextAction) {
    return (
      <div className="bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-green-800 mb-3">
            🎉 All Done!
          </h2>
          <p className="text-green-600 text-sm sm:text-base">
            No next action found. You're all caught up!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 sm:p-8 border border-white/20">
      {/* Main Action Content */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 mt-1">
            <div className="h-3 w-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            {nextAction.title}
          </h1>
        </div>
        
        {nextAction.description && (
          <div className="ml-6 mb-4">
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
              {nextAction.description}
            </p>
          </div>
        )}
        
        {nextAction.vision && (
          <div className="ml-6 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-gradient-to-b from-blue-400 to-purple-400 rounded-r-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div>
                <span className="font-semibold text-blue-900 text-sm">Vision:</span>
                <p className="text-blue-800 text-sm sm:text-base mt-1 leading-relaxed">
                  {nextAction.vision}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parent Context */}
      {nextAction.parent_chain.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Context</h3>
          </div>
          <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/50">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {nextAction.parent_chain.map((parent, index) => (
                <div key={parent.id} className="flex items-center">
                  {index > 0 && (
                    <svg className="h-4 w-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className="bg-white px-3 py-1 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-default font-medium">
                    {parent.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dependencies */}
      {nextAction.dependencies.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dependencies</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextAction.dependencies.map((dep) => (
              <div
                key={dep.id}
                className={`flex items-center space-x-3 p-3 rounded-xl border transition-all duration-200 ${
                  dep.done 
                    ? 'bg-green-50/80 border-green-200/50 text-green-800' 
                    : 'bg-yellow-50/80 border-yellow-200/50 text-yellow-800'
                }`}
              >
                <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                  dep.done ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {dep.done ? (
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium truncate">{dep.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mark Complete Button */}
      <div className="mt-8">
        {completed ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-green-800 mb-1">
                  Action Completed! 🎉
                </p>
                <p className="text-sm text-green-600">
                  Loading next action...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={markComplete}
            disabled={completing}
            className={`w-full group relative overflow-hidden rounded-2xl px-8 py-4 text-lg font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-offset-2 shadow-xl hover:shadow-2xl ${
              completing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500'
            }`}
          >
            <div className="relative flex justify-center items-center">
              {completing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Marking Complete...</span>
                </>
              ) : (
                <>
                  <svg className="mr-3 h-6 w-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mark Complete</span>
                </>
              )}
            </div>
            {!completing && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            )}
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-8 pt-6 border-t border-gray-200/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span className="font-mono">ID: {nextAction.id.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Created: {new Date(nextAction.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}