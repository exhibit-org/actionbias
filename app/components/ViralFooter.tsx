'use client'

import Link from 'next/link';
import { ArrowRight, Zap, Users, GitBranch, ChevronDown, ChevronUp } from 'react-feather';
import { useState } from 'react';

interface ViralFooterProps {
  colors: {
    border: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    textFaint: string;
  };
}

export default function ViralFooter({ colors }: ViralFooterProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <footer style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(to bottom, rgba(249, 250, 251, 0.95), rgba(255, 255, 255, 0.98))',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderTop: `1px solid ${colors.border}`,
      padding: isCollapsed ? '0.75rem 1rem' : '2rem 1rem',
      zIndex: 10,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
      transition: 'padding 0.3s ease'
    }}>
      {/* Collapse button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'white',
          border: `2px solid ${colors.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11,
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
        }}
        aria-label={isCollapsed ? 'Expand footer' : 'Collapse footer'}
      >
        {isCollapsed ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
      </button>
      <div style={{
        maxWidth: '64rem',
        margin: '0 auto',
      }}>
        {isCollapsed ? (
          /* Collapsed view - single line */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Zap size={20} style={{ color: '#3b82f6' }} />
              <span style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: colors.text
              }}>ActionBias</span>
            </div>
            
            {/* Centered text with arc effect */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%)',
              width: '100%',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              <svg 
                viewBox="0 0 600 40" 
                style={{ 
                  width: '600px', 
                  height: '40px',
                  margin: '0 auto'
                }}
              >
                <defs>
                  <path id="arc" d="M 50 20 Q 300 30 550 20" />
                </defs>
                <text 
                  style={{
                    fontSize: '14px',
                    fill: colors.textSubtle,
                    fontStyle: 'italic',
                  }}
                >
                  <textPath href="#arc" startOffset="50%" textAnchor="middle">
                    The best software knows when to get out of your way.
                  </textPath>
                </text>
              </svg>
            </div>
            
            <Link 
              href="/" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Try ActionBias Free
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
        <>
        {/* Main content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '1.5rem'
        }}>
          {/* What is ActionBias */}
          <div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              margin: '0 0 0.75rem 0',
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Zap size={20} style={{ color: '#3b82f6' }} />
              ActionBias
            </h3>
            <p style={{
              fontSize: '0.9375rem',
              color: colors.textMuted,
              margin: '0 0 1rem 0',
              lineHeight: '1.6'
            }}>
              The AI-forward planning platform that generates context-rich prompts for your AI agents. 
              Captures family context vertically and dependency context laterally to make AI truly understand your project.
            </p>
            <Link 
              href="/" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Try ActionBias Free
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Value Props */}
          <div>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 0.75rem 0',
              color: colors.text
            }}>
              Why teams love ActionBias
            </h4>
            <ul style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: '0.875rem',
              color: colors.textMuted,
              lineHeight: '1.8'
            }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>Planning is organic and flexible - evolves naturally with your project</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>Automated execution is rapid and on-target with calibrated AI agents</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>Cross-LLM persistence - never lose context between conversations</span>
              </li>
            </ul>
          </div>

          {/* Social Proof */}
          <div>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              margin: '0 0 0.75rem 0',
              color: colors.text
            }}>
              Join the community
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.875rem',
                color: colors.textMuted
              }}>
                <Users size={16} />
                <span>Used by engineers worldwide</span>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.875rem'
            }}>
              <GitBranch size={16} style={{ color: colors.textSubtle }} />
              <a 
                href="https://github.com/exhibit-org/actionbias" 
                style={{ 
                  color: colors.textSubtle, 
                  textDecoration: 'none',
                  borderBottom: `1px solid ${colors.border}`,
                  paddingBottom: '1px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = colors.text;
                  e.currentTarget.style.borderBottomColor = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = colors.textSubtle;
                  e.currentTarget.style.borderBottomColor = colors.border;
                }}
              >
                Open source on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          fontSize: '0.75rem',
          color: colors.textFaint,
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span>Built for engineers who ship</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/" style={{ color: colors.textSubtle, textDecoration: 'none' }}>
              Learn More
            </Link>
            <a href="https://github.com/exhibit-org/actionbias" style={{ color: colors.textSubtle, textDecoration: 'none' }}>
              GitHub
            </a>
          </div>
        </div>
        </>
        )}
      </div>
    </footer>
  );
}