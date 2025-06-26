'use client';

import { useState, useEffect } from 'react';
import { ActionDetailResource } from '../../../lib/types/resources';
import { ColorScheme } from './types';
import ActionPageSkeleton from './ActionPageSkeleton';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';

interface Props {
  colors: ColorScheme;
  actionId?: string; // If provided, fetch this specific action instead of next action
}

export default function NextActionDisplay({ colors, actionId }: Props) {
  const [actionData, setActionData] = useState<ActionDetailResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyingCodex, setCopyingCodex] = useState(false);

  useEffect(() => {
    const fetchAction = async () => {
      try {
        setLoading(true);
        setError(null);
        const endpoint = actionId ? `/api/actions/${actionId}` : '/api/actions/next';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || `Failed to fetch ${actionId ? 'action' : 'next action'}`);
        setActionData(data.data);
      } catch (err) {
        console.error(`Error fetching ${actionId ? 'action' : 'next action'}:`, err);
        setError(err instanceof Error ? err.message : `Failed to fetch ${actionId ? 'action' : 'next action'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAction();
  }, [actionId]);

  const generateActionPrompt = (action: ActionDetailResource): string => {
    return buildActionPrompt(action);
  };

  const copyPromptToClipboard = async () => {
    if (!actionData) return;
    try {
      setCopying(true);
      const prompt = generateActionPrompt(actionData);
      await navigator.clipboard.writeText(prompt);
      setTimeout(() => setCopying(false), 1000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopying(false);
    }
  };

  const copyActionUrl = async () => {
    if (!actionData) return;
    try {
      setCopyingCodex(true);
      const url = `https://www.actionbias.ai/${actionData.id}`;
      await navigator.clipboard.writeText(url);
      setTimeout(() => setCopyingCodex(false), 1000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setCopyingCodex(false);
    }
  };

  if (loading) {
    return <ActionPageSkeleton colors={colors} isMobile={false} />;
  }

  if (error) {
    return (
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1.5rem', borderLeft: `4px solid ${colors.borderAccent}` }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.text, marginBottom: '0.5rem' }}>Error Loading Next Action</h2>
        <p style={{ color: colors.textMuted, marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', backgroundColor: colors.borderAccent, color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}>
          Retry
        </button>
      </div>
    );
  }

  if (!actionData) {
    return (
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1.5rem', borderLeft: `4px solid ${colors.borderAccent}` }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.text, marginBottom: '0.5rem' }}>🎉 All Done!</h2>
        <p style={{ color: colors.textMuted }}>No next action found. You're all caught up!</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
      {/* Markdown Prompt Display */}
      <pre style={{ 
        backgroundColor: colors.surface, 
        padding: '1.5rem', 
        borderRadius: '0.375rem', 
        border: `1px solid ${colors.border}`,
        overflow: 'auto',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        color: colors.text,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {actionData ? generateActionPrompt(actionData) : ''}
      </pre>
      
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={copyPromptToClipboard} disabled={copying} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: copying ? colors.surface : colors.borderAccent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: copying ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' }} onMouseEnter={e => { if (!copying) { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; } }} onMouseLeave={e => { if (!copying) { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; } }}>
          {copying ? (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Prompt Text
            </>
          )}
        </button>
        <button onClick={copyActionUrl} disabled={copyingCodex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: copyingCodex ? colors.surface : colors.borderAccent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: copyingCodex ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' }} onMouseEnter={e => { if (!copyingCodex) { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; } }} onMouseLeave={e => { if (!copyingCodex) { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; } }}>
          {copyingCodex ? (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Prompt URL
            </>
          )}
        </button>
      </div>
    </div>
  );
}
