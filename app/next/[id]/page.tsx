'use client';

import { useState, useEffect } from 'react';
import NextActionDisplay from '../components/NextActionDisplay';

export default function ScopedNextPage({ params }: { params: Promise<{ id: string }> }) {
  const [scopedActionId, setScopedActionId] = useState<string | null>(null);
  const [scopeTitle, setScopeTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Full grayscale color scheme with enhanced visual hierarchy (no colors)
  const colors = {
    bg: '#f9fafb',           // Very light gray background
    surface: '#f3f4f6',      // Light gray surface  
    border: '#e5e7eb',       // Medium gray border
    borderAccent: '#1f2937', // Very dark gray accent (no color, maximum contrast)
    text: '#111827',         // Very dark gray (black) for primary text
    textMuted: '#4b5563',    // Medium dark gray for secondary text
    textSubtle: '#6b7280',   // Medium gray for tertiary text
    textFaint: '#9ca3af'     // Light gray for faint text/metadata
  };

  useEffect(() => {
    const fetchScopedNextAction = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Await the params
        const { id } = await params;
        
        // First, get the scope action details to show its title
        const scopeResponse = await fetch(`/api/actions/${id}`);
        if (!scopeResponse.ok) {
          throw new Error(`Failed to fetch scope action: ${scopeResponse.status}`);
        }
        const scopeData = await scopeResponse.json();
        if (!scopeData.success) {
          throw new Error(scopeData.error || 'Failed to fetch scope action');
        }
        setScopeTitle(scopeData.data.title);

        // Then fetch the scoped next action using the MCP resource
        const response = await fetch(`/mcp/sse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'resources/read',
            params: {
              uri: `action://next/${id}`
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const lines = text.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(5));
            if (data.result?.contents?.[0]?.text) {
              const actionData = JSON.parse(data.result.contents[0].text);
              if (actionData.id) {
                setScopedActionId(actionData.id);
              } else if (actionData.next_action === null) {
                // No next action in this scope
                setScopedActionId(null);
              }
              break;
            }
          } catch (parseError) {
            console.error('Error parsing MCP response line:', parseError);
          }
        }
      } catch (err) {
        console.error('Error fetching scoped next action:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch scoped next action');
      } finally {
        setLoading(false);
      }
    };

    fetchScopedNextAction();
  }, [params]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          flex: '1',
          overflow: 'auto',
          padding: '2rem 1rem 1rem 1rem'
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto'
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
              borderRadius: '0.5rem', 
              padding: '1.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                height: '1.5rem', 
                backgroundColor: colors.border, 
                borderRadius: '0.25rem', 
                width: '60%', 
                marginBottom: '1rem'
              }}></div>
              <div style={{ 
                height: '1rem', 
                backgroundColor: colors.border, 
                borderRadius: '0.25rem', 
                width: '40%'
              }}></div>
            </div>
            <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ height: '1.5rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '25%', marginBottom: '1rem' }}></div>
              <div style={{ height: '1rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '75%', marginBottom: '0.5rem' }}></div>
              <div style={{ height: '1rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '50%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          flex: '1',
          overflow: 'auto',
          padding: '2rem 1rem 1rem 1rem'
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto'
          }}>
            <div style={{ 
              backgroundColor: colors.surface, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '0.5rem', 
              padding: '1.5rem', 
              borderLeft: `4px solid ${colors.borderAccent}` 
            }}>
              <h2 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: colors.text, 
                marginBottom: '0.5rem' 
              }}>
                Error Loading Scoped Next Action
              </h2>
              <p style={{ color: colors.textMuted, marginBottom: '1rem' }}>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: colors.borderAccent, 
                  color: 'white', 
                  borderRadius: '0.25rem', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '0.875rem' 
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Project Scope Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${colors.border}`,
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: colors.borderAccent,
            borderRadius: '50%',
            flexShrink: 0
          }}></div>
          <div>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: colors.text,
              margin: '0 0 0.25rem 0'
            }}>
              Next Action in: {scopeTitle}
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: colors.textMuted,
              margin: 0
            }}>
              Scoped to this project • <a 
                href="/next" 
                style={{ 
                  color: colors.textSubtle, 
                  textDecoration: 'none' 
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
              >
                View all projects
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div style={{
        flex: '1',
        overflow: 'auto',
        padding: '2rem 1rem 1rem 1rem'
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto'
        }}>
          {scopedActionId ? (
            <NextActionDisplay colors={colors} actionId={scopedActionId} />
          ) : (
            <div style={{ 
              backgroundColor: colors.surface, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '0.5rem', 
              padding: '1.5rem', 
              borderLeft: `4px solid ${colors.borderAccent}` 
            }}>
              <h2 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: colors.text, 
                marginBottom: '0.5rem' 
              }}>
                🎉 Project Complete!
              </h2>
              <p style={{ color: colors.textMuted, marginBottom: '1rem' }}>
                No next action found in "{scopeTitle}". All tasks in this project are done!
              </p>
              <a 
                href="/next" 
                style={{ 
                  display: 'inline-block',
                  padding: '0.5rem 1rem', 
                  backgroundColor: colors.borderAccent, 
                  color: 'white', 
                  borderRadius: '0.25rem', 
                  textDecoration: 'none',
                  fontSize: '0.875rem' 
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
              >
                View Next Action Across All Projects
              </a>
            </div>
          )}
        </div>
      </div>
      
      {/* Persistent Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: `1px solid ${colors.border}`,
        padding: '1.5rem 1rem',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: colors.text,
              margin: '0 0 0.5rem 0'
            }}>
              ActionBias
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: colors.textMuted,
              margin: '0 0 0.75rem 0',
              lineHeight: '1.5'
            }}>
              Cross-LLM persistent planning system for focused action taking
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: colors.textSubtle,
              margin: 0,
              lineHeight: '1.4'
            }}>
              Stay focused on what matters most. Break down complex projects into actionable steps with context-aware prioritization.
            </p>
          </div>
          
          {/* Future: User info section will go here when multi-tenancy is implemented */}
          <div style={{
            fontSize: '0.75rem',
            color: colors.textFaint,
            borderTop: `1px solid ${colors.border}`,
            paddingTop: '0.75rem'
          }}>
            Single-user instance • <a href="https://github.com/exhibit-org/actionbias" style={{ color: colors.textSubtle, textDecoration: 'none' }}>Open Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
}