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
        
        // Fetch from the MCP server endpoint
        const response = await fetch('/mcp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'resources/read',
            params: {
              uri: 'actions://next'
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message || 'Failed to fetch next action');
        }

        // Parse the response - MCP returns the data in contents array
        if (data.result?.contents?.[0]?.text) {
          const actionData = JSON.parse(data.result.contents[0].text);
          setNextAction(actionData);
        } else {
          setNextAction(null);
        }
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
      
      // Call the MCP update_action tool
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'update_action',
            arguments: {
              action_id: nextAction.id,
              done: true
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to mark action as complete');
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Error Loading Next Action
        </h2>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!nextAction) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-green-800 mb-2">
          🎉 All Done!
        </h2>
        <p className="text-green-600">
          No next action found. You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {nextAction.title}
        </h1>
        
        {nextAction.description && (
          <p className="text-gray-700 mb-3">
            {nextAction.description}
          </p>
        )}
        
        {nextAction.vision && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
            <p className="text-blue-800 text-sm">
              <span className="font-medium">Vision:</span> {nextAction.vision}
            </p>
          </div>
        )}
      </div>

      {/* Parent Context */}
      {nextAction.parent_chain.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Context</h3>
          <div className="text-sm text-gray-600">
            {nextAction.parent_chain.map((parent, index) => (
              <span key={parent.id}>
                {index > 0 && ' → '}
                <span className="hover:text-gray-800 cursor-default">
                  {parent.title}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {nextAction.dependencies.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Dependencies</h3>
          <div className="flex flex-wrap gap-2">
            {nextAction.dependencies.map((dep) => (
              <span
                key={dep.id}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  dep.done 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {dep.done ? '✓' : '⏳'} {dep.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Mark Complete Button */}
      <div className="mt-6">
        {completed ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Action completed! Loading next action...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={markComplete}
            disabled={completing}
            className={`w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white transition-colors ${
              completing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {completing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Marking Complete...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Mark Complete
              </>
            )}
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>ID: {nextAction.id}</span>
          <span>Created: {new Date(nextAction.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}