import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#000000',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          position: 'relative',
        }}
      >
        {/* Terminal window frame */}
        <div
          style={{
            width: '900px',
            background: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Terminal header */}
          <div
            style={{
              background: '#1a1a1a',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              borderBottom: '1px solid #333',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ff5f56',
                marginRight: '8px',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ffbd2e',
                marginRight: '8px',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#27c93f',
              }}
            />
            <span
              style={{
                color: '#666',
                fontSize: '14px',
                marginLeft: '20px',
              }}
            >
              done.engineering
            </span>
          </div>
          
          {/* Terminal content */}
          <div
            style={{
              padding: '40px',
              color: '#10b981',
              fontSize: '16px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <span style={{ color: '#10b981' }}>$</span>
              <span style={{ color: '#666', marginLeft: '8px' }}>claude-code</span>
              <span style={{ color: '#444', marginLeft: '8px' }}>~/projects/startup</span>
            </div>
            
            <div style={{ color: '#fff', fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>
              Ship code. Tell the story.
            </div>
            <div style={{ color: '#10b981', fontSize: '36px', marginBottom: '32px' }}>
              Done is the engine of more.
            </div>
            
            <div style={{ color: '#888', fontSize: '20px', lineHeight: 1.8 }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#10b981' }}>&gt;</span> Your AI agents complete work with perfect memory
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: '#10b981' }}>&gt;</span> Transform logs into magazine-quality changelogs
              </div>
              <div>
                <span style={{ color: '#10b981' }}>&gt;</span> Build institutional memory that persists
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '18px',
            color: '#333',
            fontFamily: 'monospace',
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