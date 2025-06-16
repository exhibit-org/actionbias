import NextActionDisplay from './components/NextActionDisplay';

export const metadata = {
  title: 'Next Action - ActionBias',
  description: 'Your next action to focus on',
};

export default function NextPage() {
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
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
          <NextActionDisplay colors={colors} />
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
