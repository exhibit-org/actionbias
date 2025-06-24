interface FooterProps {
  colors: {
    border: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    textFaint: string;
  };
}

export default function Footer({ colors }: FooterProps) {
  return (
    <footer style={{
      backgroundColor: '#ffffff',
      borderTop: `1px solid ${colors.border}`,
      padding: '1.5rem 1rem',
      marginTop: '2rem'
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
            margin: '0 0 0.5rem 0'
          }}>
            <a href="/tree" style={{
              color: colors.text,
              textDecoration: 'none'
            }}>
              ActionBias
            </a>
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
  );
}