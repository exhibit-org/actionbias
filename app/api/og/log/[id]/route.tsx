import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

// Removed edge runtime to support database connections

import { getDb } from '@/lib/db/adapter';
import { completionContexts, actions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Fetch changelog data directly from database
async function getChangelogItem(id: string) {
  try {
    const db = getDb();
    
    const result = await db
      .select({
        // Completion context fields
        id: completionContexts.id,
        actionId: completionContexts.actionId,
        implementationStory: completionContexts.implementationStory,
        impactStory: completionContexts.impactStory,
        learningStory: completionContexts.learningStory,
        changelogVisibility: completionContexts.changelogVisibility,
        completionTimestamp: completionContexts.completionTimestamp,
        createdAt: completionContexts.createdAt,
        updatedAt: completionContexts.updatedAt,
        
        // Action fields
        actionTitle: actions.title,
        actionDescription: actions.description,
        actionVision: actions.vision,
        actionDone: actions.done,
        actionCreatedAt: actions.createdAt,
      })
      .from(completionContexts)
      .innerJoin(actions, eq(completionContexts.actionId, actions.id))
      .where(eq(actions.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error fetching changelog item for OG:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const changelogItem = await getChangelogItem(id);
    
    if (!changelogItem) {
      // Default image for not found
      return new ImageResponse(
        (
          <div
            style={{
              background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div style={{ fontSize: 60, color: '#666', marginBottom: 20, display: 'flex' }}>🚫</div>
            <div style={{ fontSize: 32, color: '#666', display: 'flex' }}>Action Not Found</div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
    
    // Clean up text for display
    const cleanText = (text: string, maxLength: number = 200) => {
      if (!text) return '';
      const cleaned = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\n/g, ' ')
        .trim();
      return cleaned.length > maxLength 
        ? cleaned.substring(0, maxLength - 3) + '...' 
        : cleaned;
    };
    
    const title = changelogItem.actionTitle;
    const description = cleanText(
      changelogItem.impactStory || 
      changelogItem.actionDescription || 
      'A completed action in ActionBias'
    );
    
    const completionDate = new Date(changelogItem.completionTimestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #111827 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '60px 80px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
          }}
        >
          {/* Top branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '60px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                letterSpacing: '-0.5px',
              }}
            >
              ActionBias
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#94a3b8',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                padding: '6px 16px',
                borderRadius: '20px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              {changelogItem.changelogVisibility === 'public' ? '🌐 Public' :
               changelogItem.changelogVisibility === 'team' ? '👥 Team' : '🔒 Private'}
            </div>
          </div>
          
          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Status indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                }}
              />
              <div style={{ fontSize: '16px', color: '#10b981', fontWeight: 500, display: 'flex' }}>
                Completed {completionDate}
              </div>
            </div>
            
            {/* Title */}
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.2,
                marginBottom: '32px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </h1>
            
            {/* Description */}
            <p
              style={{
                fontSize: '20px',
                color: '#cbd5e1',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </p>
          </div>
          
          {/* Bottom tagline */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '40px',
              paddingTop: '40px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '16px', color: '#64748b' }}>
              Dream like a human. Execute like a machine.
            </div>
            <div style={{ fontSize: '14px', color: '#475569' }}>
              actionbias.ai
            </div>
          </div>
          
          {/* Decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '40px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Fallback error image
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
          }}
        >
          <div style={{ fontSize: 32, color: 'white', marginBottom: 16, display: 'flex' }}>ActionBias</div>
          <div style={{ fontSize: 18, color: '#64748b', display: 'flex' }}>Dream like a human. Execute like a machine.</div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}