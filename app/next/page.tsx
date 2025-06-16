import NextActionDisplay from './components/NextActionDisplay';

export const metadata = {
  title: 'Next Action - ActionBias',
  description: 'Your next action to focus on',
};

export default function NextPage() {
  // Monochromatic blue color scheme
  const colors = {
    bg: '#f8fafc',           // Very light blue-gray
    surface: '#f1f5f9',      // Light blue-gray  
    border: '#e2e8f0',       // Medium blue-gray
    borderAccent: '#3b82f6', // Base blue
    text: '#0f172a',         // Very dark blue
    textMuted: '#475569',    // Medium dark blue
    textSubtle: '#64748b',   // Medium blue
    textFaint: '#94a3b8'     // Light blue
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
