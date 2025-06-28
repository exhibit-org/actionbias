/**
 * Example tests demonstrating how to use the OG image test utilities
 */

import React from 'react';
import {
  setupOgImageMocks,
  testOgImageEndpoint,
  mockOgFonts,
  extractOgImageText,
  testOgImageError,
  createMockOgImageData,
  verifyOgImageDimensions,
  testOgImageCaching,
  cleanupOgImageMocks,
} from '../utils/og-image-test-utils';

describe('OG Image Test Utilities Examples', () => {
  beforeEach(() => {
    setupOgImageMocks();
    mockOgFonts();
  });

  afterEach(() => {
    cleanupOgImageMocks();
  });

  describe('Basic OG image testing', () => {
    // Example OG image endpoint
    const ogImageEndpoint = async ({ params }: { params: { id: string } }) => {
      const { ImageResponse } = await import('@vercel/og');
      
      return new ImageResponse(
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1a1a1a',
              color: 'white',
            },
          },
          React.createElement('h1', { style: { fontSize: 60 } }, `Action ${params.id}`),
          React.createElement('p', { style: { fontSize: 30 } }, 'Open Graph Image')
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    };

    it('should test OG image endpoint', async () => {
      const response = await testOgImageEndpoint(
        ogImageEndpoint,
        { params: { id: '123' } },
        {
          width: 1200,
          height: 630,
        }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
    });

    it('should extract text from OG image', async () => {
      const response = await ogImageEndpoint({ params: { id: '456' } });
      
      // Extract text from the rendered element
      const texts = extractOgImageText((response as any)._element);
      
      expect(texts).toContain('Action 456');
      expect(texts).toContain('Open Graph Image');
    });

    it('should verify image dimensions', async () => {
      const response = await ogImageEndpoint({ params: { id: '789' } });
      
      verifyOgImageDimensions(response, 1200, 630);
    });
  });

  describe('OG image with dynamic data', () => {
    const dynamicOgEndpoint = async ({ searchParams }: { searchParams: URLSearchParams }) => {
      const { ImageResponse } = await import('@vercel/og');
      
      const title = searchParams.get('title') || 'Default Title';
      const description = searchParams.get('description') || 'Default Description';
      
      const data = createMockOgImageData({
        title,
        description,
      });
      
      return new ImageResponse(
        React.createElement(
          'div',
          { style: { padding: 40 } },
          React.createElement('h1', null, data.title),
          React.createElement('p', null, data.description),
          React.createElement('div', null, `${data.author} • ${data.readTime}`),
          React.createElement('div', null, data.tags.join(', '))
        ),
        {
          width: 1200,
          height: 630,
          headers: {
            'cache-control': 'public, max-age=3600',
          },
        }
      );
    };

    it('should handle dynamic data', async () => {
      const searchParams = new URLSearchParams({
        title: 'Custom Title',
        description: 'Custom Description',
      });

      const response = await dynamicOgEndpoint({ searchParams });
      const texts = extractOgImageText((response as any)._element);
      
      expect(texts).toContain('Custom Title');
      expect(texts).toContain('Custom Description');
      expect(texts).toContain('Test Author • 5 min read');
      expect(texts).toContain('test, mock, data');
    });

    it('should test caching headers', async () => {
      const searchParams = new URLSearchParams();
      
      await testOgImageCaching(
        dynamicOgEndpoint,
        { searchParams },
        'public, max-age=3600'
      );
    });
  });

  describe('OG image error handling', () => {
    const errorOgEndpoint = async ({ params }: { params: { id: string } }) => {
      if (params.id === 'error') {
        return new Response('Action not found', { status: 404 });
      }
      
      const { ImageResponse } = await import('@vercel/og');
      return new ImageResponse(React.createElement('div', null, 'Success'));
    };

    it('should handle 404 errors', async () => {
      await testOgImageError(
        errorOgEndpoint,
        { params: { id: 'error' } },
        {
          status: 404,
          message: 'Action not found',
        }
      );
    });

    it('should handle success case', async () => {
      const response = await errorOgEndpoint({ params: { id: 'valid' } });
      expect(response.status).toBe(200);
    });
  });

  describe('Complex OG image with styles', () => {
    const complexOgEndpoint = async () => {
      const { ImageResponse } = await import('@vercel/og');
      
      return new ImageResponse(
        React.createElement(
          'div',
          {
            style: {
              width: '100%',
              height: '100%',
              display: 'flex',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
          },
          React.createElement(
            'div',
            {
              style: {
                margin: 'auto',
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 40,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              },
            },
            React.createElement('h1', { style: { fontSize: 48, margin: 0 } }, 'ActionBias'),
            React.createElement(
              'p',
              { style: { fontSize: 24, color: '#666' } },
              'Dream like a human. Execute like a machine.'
            )
          )
        ),
        {
          width: 1200,
          height: 630,
          headers: {
            'cache-control': 'public, max-age=31536000, immutable',
          },
        }
      );
    };

    it('should render complex styled OG image', async () => {
      const response = await testOgImageEndpoint(
        complexOgEndpoint,
        {},
        {
          width: 1200,
          height: 630,
          cacheControl: 'public, max-age=31536000, immutable',
        }
      );

      const texts = extractOgImageText((response as any)._element);
      expect(texts).toContain('ActionBias');
      expect(texts).toContain('Dream like a human. Execute like a machine.');
    });
  });

  describe('Testing font loading', () => {
    it('should mock font loading', async () => {
      const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700';
      const response = await fetch(fontUrl);
      
      expect(response.ok).toBe(true);
      
      const buffer = await response.arrayBuffer();
      expect(buffer.byteLength).toBe(1000); // Mocked size
    });
  });
});