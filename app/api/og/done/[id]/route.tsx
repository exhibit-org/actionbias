import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

// Removed edge runtime to support database connections

import { getDb } from '@/lib/db/adapter';
import { completionContexts, actions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Fetch completion data directly from database
async function getCompletionItem(id: string) {
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
    console.error('Error fetching completion item for OG:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const completionItem = await getCompletionItem(id);
    
    if (!completionItem) {
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
    
    const title = completionItem.actionTitle;
    const description = cleanText(
      completionItem.impactStory || 
      completionItem.actionDescription || 
      'A completed action in done.engineering'
    );
    
    const completionDate = new Date(completionItem.completionTimestamp).toLocaleDateString('en-US', {
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
          
          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Title */}
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#94a3b8',
                lineHeight: 1.3,
                marginBottom: '24px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </h1>
            
            {/* Description */}
            <p
              style={{
                fontSize: '42px',
                color: '#e2e8f0',
                lineHeight: 1.4,
                fontWeight: 300,
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </p>
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
          <div style={{ fontSize: 32, color: 'white', marginBottom: 16, display: 'flex' }}>done.engineering</div>
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