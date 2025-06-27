import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #111827 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          {/* Logo/Brand */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '40px',
              letterSpacing: '-1px',
            }}
          >
            done.engineering
          </div>
          
          {/* Tagline */}
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: 'white',
              lineHeight: 1.1,
              marginBottom: '24px',
            }}
          >
            Your context, everywhere.
          </h1>
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#3b82f6',
              lineHeight: 1.1,
              marginBottom: '40px',
            }}
          >
            Never start over again.
          </h1>
          
          {/* Description */}
          <p
            style={{
              fontSize: '24px',
              color: '#94a3b8',
              lineHeight: 1.4,
              maxWidth: '600px',
            }}
          >
            The context layer for AI development. Keep your project history alive across Claude Code, Gemini CLI, and every AI tool.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '60px',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '60px',
            width: '250px',
            height: '250px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(80px)',
          }}
        />
        
        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '18px',
            color: '#475569',
          }}
        >
          done.engineering
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}