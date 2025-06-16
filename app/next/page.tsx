import NextActionDisplay from './components/NextActionDisplay';

export const metadata = {
  title: 'Next Action - ActionBias',
  description: 'Your next action to focus on',
};

export default function NextPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
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
          <NextActionDisplay />
        </div>
      </div>
      
      {/* Persistent Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
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
              color: '#111827',
              margin: '0 0 0.5rem 0'
            }}>
              ActionBias
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: '0 0 0.75rem 0',
              lineHeight: '1.5'
            }}>
              Cross-LLM persistent planning system for focused action taking
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Stay focused on what matters most. Break down complex projects into actionable steps with context-aware prioritization.
            </p>
          </div>
          
          {/* Future: User info section will go here when multi-tenancy is implemented */}
          <div style={{
            fontSize: '0.75rem',
            color: '#d1d5db',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '0.75rem'
          }}>
            Single-user instance • <a href="https://github.com/exhibit-org/actionbias" style={{ color: '#6b7280', textDecoration: 'none' }}>Open Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
