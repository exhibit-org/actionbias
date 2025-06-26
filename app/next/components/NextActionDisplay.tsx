'use client';

import { useState, useEffect } from 'react';
import { ActionDetailResource } from '../../../lib/types/resources';
import { ColorScheme } from './types';
import ActionPageSkeleton from './ActionPageSkeleton';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';
import { Copy, Link, Check } from 'react-feather';

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
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={copyPromptToClipboard} 
          disabled={copying} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            backgroundColor: colors.surface, 
            color: copying ? colors.borderAccent : colors.textMuted, 
            border: `1px solid ${colors.border}`, 
            borderRadius: '0.375rem', 
            cursor: copying ? 'not-allowed' : 'pointer', 
            transition: 'all 0.2s ease' 
          }} 
          onMouseEnter={e => { if (!copying) { e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.color = colors.text; } }} 
          onMouseLeave={e => { if (!copying) { e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.color = colors.textMuted; } }}
          title="Copy prompt text"
        >
          {copying ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <button 
          onClick={copyActionUrl} 
          disabled={copyingCodex} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            backgroundColor: colors.surface, 
            color: copyingCodex ? colors.borderAccent : colors.textMuted, 
            border: `1px solid ${colors.border}`, 
            borderRadius: '0.375rem', 
            cursor: copyingCodex ? 'not-allowed' : 'pointer', 
            transition: 'all 0.2s ease' 
          }} 
          onMouseEnter={e => { if (!copyingCodex) { e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.color = colors.text; } }} 
          onMouseLeave={e => { if (!copyingCodex) { e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.color = colors.textMuted; } }}
          title="Copy action URL"
        >
          {copyingCodex ? <Check size={16} /> : <Link size={16} />}
        </button>
      </div>
      
      <pre style={{ 
        fontSize: '0.875rem',
        lineHeight: '1.6',
        color: colors.text,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {actionData ? generateActionPrompt(actionData) : ''}
      </pre>
    </>
  );
}
