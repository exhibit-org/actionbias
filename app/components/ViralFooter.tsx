'use client'

import Link from 'next/link';
import { ArrowRight, Zap, Users, GitBranch, ChevronDown, ChevronUp } from 'react-feather';
import { useState, useEffect } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
          outline: 'none',
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
          /* Collapsed view */
          isMobile ? (
            /* Mobile layout - two lines */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {/* First row: Tagline with arc effect */}
              <div style={{
                width: '100%',
                textAlign: 'center',
              }}>
                <svg 
                  viewBox="0 0 400 40" 
                  style={{ 
                    width: '100%', 
                    height: '40px',
                    margin: '0 auto'
                  }}
                >
                  <defs>
                    <path id="mobileArc" d="M 20 20 Q 200 30 380 20" />
                  </defs>
                  <text 
                    style={{
                      fontSize: '14px',
                      fill: colors.textSubtle,
                      fontStyle: 'italic',
                    }}
                  >
                    <textPath href="#mobileArc" startOffset="50%" textAnchor="middle">
                      Great software knows how to get out of your way.
                    </textPath>
                  </text>
                </svg>
              </div>
              {/* Second row: Logo and CTA */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
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
                  }}>actions.engineering</span>
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
                  Begin
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            /* Desktop layout - single line with arc */
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
                }}>actions.engineering</span>
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
                      Great software knows how to get out of your way.
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
                Begin
                <ArrowRight size={16} />
              </Link>
            </div>
          )
        ) : (
        <>
        {/* Main content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          marginBottom: '1.5rem'
        }}>
          {/* What is done.engineering */}
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
              actions.engineering
            </h3>
            <p style={{
              fontSize: '0.9375rem',
              color: colors.textMuted,
              margin: '0 0 1rem 0',
              lineHeight: '1.6'
            }}>
              The context layer for AI development. Keep your entire project history alive across Claude Code, Gemini CLI, and every AI tool. Actions are the engine of more.
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
              Begin
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
              Why people love actions.engineering
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
                <span>Your context, everywhere - never lose progress between AI conversations</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>Works seamlessly with Claude Code, Gemini CLI, and all MCP-enabled tools</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>AI-powered intelligent task organization and dependency tracking</span>
              </li>
            </ul>
          </div>

          {/* Social Proof - Only show on desktop */}
          {!isMobile && (
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
                <span>Used by doers worldwide</span>
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
          )}
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
          <span>Built for people who get things done</span>
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