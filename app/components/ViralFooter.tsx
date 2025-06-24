import Link from 'next/link';
import { ArrowRight, Zap, Users, GitBranch } from 'react-feather';

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
      padding: '2rem 1rem',
      zIndex: 10,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)'
    }}>
      <div style={{
        maxWidth: '64rem',
        margin: '0 auto',
      }}>
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
                <span>Generates perfect prompts with full project context for AI agents</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>Captures vertical (family) and lateral (dependency) relationships</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: '#10b981', marginTop: '0.125rem' }}>✓</span>
                <span>Works seamlessly with ChatGPT, Claude, and any LLM</span>
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
      </div>
    </footer>
  );
}