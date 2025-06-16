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
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <div data-testid="loading-skeleton">
          <div style={{
            height: '1.5rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            width: '25%',
            marginBottom: '1rem'
          }}></div>
          <div style={{
            height: '1rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            width: '75%',
            marginBottom: '0.5rem'
          }}></div>
          <div style={{
            height: '1rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            width: '50%'
          }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#991b1b',
          marginBottom: '0.5rem'
        }}>
          Error Loading Next Action
        </h2>
        <p style={{
          color: '#dc2626',
          marginBottom: '1rem'
        }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '0.25rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
          onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#b91c1c'}
          onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!nextAction) {
    return (
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#166534',
          marginBottom: '0.5rem'
        }}>
          🎉 All Done!
        </h2>
        <p style={{
          color: '#16a34a'
        }}>
          No next action found. You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem'
    }}>
      {/* Main Action Content */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '0.75rem', 
          marginBottom: '1rem' 
        }}>
          <div style={{ 
            flexShrink: 0, 
            marginTop: '0.25rem' 
          }}>
            <div style={{ 
              height: '0.75rem', 
              width: '0.75rem', 
              backgroundColor: '#3b82f6', 
              borderRadius: '50%' 
            }}></div>
          </div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            lineHeight: '1.25',
            margin: 0
          }}>
            {nextAction.title}
          </h1>
        </div>
        
        {nextAction.description && (
          <div style={{ 
            marginLeft: '1.5rem', 
            marginBottom: '1rem' 
          }}>
            <p style={{ 
              color: '#374151', 
              fontSize: '1rem', 
              lineHeight: '1.625' 
            }}>
              {nextAction.description}
            </p>
          </div>
        )}
        
        {nextAction.vision && (
          <div style={{ 
            marginLeft: '1.5rem', 
            backgroundColor: '#eff6ff', 
            borderLeft: '4px solid #60a5fa', 
            borderTopRightRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.75rem' 
            }}>
              <svg 
                style={{
                  width: '16px', 
                  height: '16px', 
                  minWidth: '16px', 
                  maxWidth: '16px',
                  color: '#2563eb',
                  marginTop: '0.125rem',
                  flexShrink: 0
                }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ 
                  fontWeight: '600', 
                  color: '#1e3a8a', 
                  fontSize: '0.875rem' 
                }}>Vision:</span>
                <p style={{ 
                  color: '#1e40af', 
                  fontSize: '0.875rem', 
                  marginTop: '0.25rem', 
                  lineHeight: '1.625' 
                }}>
                  {nextAction.vision}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parent Context */}
      {nextAction.parent_chain.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '16px', height: '16px', minWidth: '16px', maxWidth: '16px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Context</h3>
          </div>
          <div className="bg-gray-50 rounded p-4 border border-gray-200">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {nextAction.parent_chain.map((parent, index) => (
                <div key={parent.id} className="flex items-center">
                  {index > 0 && (
                    <svg className="h-3 w-3 text-gray-400 mx-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px'}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span className="bg-white px-3 py-1 rounded border border-gray-200 font-medium">
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
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '16px', height: '16px', minWidth: '16px', maxWidth: '16px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dependencies</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextAction.dependencies.map((dep) => (
              <div
                key={dep.id}
                className={`flex items-center space-x-3 p-3 rounded border ${
                  dep.done 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                <div className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${
                  dep.done ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {dep.done ? (
                    <svg className="h-3 w-3 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px'}}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px'}}>
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
      <div className="mt-6">
        {completed ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="h-5 w-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px'}}>
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
            className={`w-full rounded-lg px-6 py-3 text-lg font-semibold text-white transition-colors ${
              completing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
            }`}
          >
            <div className="flex justify-center items-center">
              {completing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px'}}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Marking Complete...</span>
                </>
              ) : (
                <>
                  <svg className="mr-3 h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '20px', height: '20px', minWidth: '20px', maxWidth: '20px'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mark Complete</span>
                </>
              )}
            </div>
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span className="font-mono">ID: {nextAction.id.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Created: {new Date(nextAction.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}