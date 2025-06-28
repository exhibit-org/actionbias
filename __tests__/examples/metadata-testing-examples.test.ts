/**
 * Example tests demonstrating how to use the metadata test utilities
 */

import { Metadata } from 'next';
import {
  createMockMetadata,
  createMockOpenGraph,
  createMockTwitter,
  createMockFullMetadata,
  validateOpenGraphTags,
  validateTwitterTags,
  setupMetadataMatchers,
  metadataFixtures,
} from '../utils/metadata-test-utils';
import {
  testGenerateMetadata,
  createMockParams,
  setupFetchMock,
  setupEnvironmentMocks,
} from '../utils/next-metadata-mocks';

// Setup custom matchers
beforeAll(() => {
  setupMetadataMatchers();
});

describe('Metadata Test Utilities Examples', () => {
  describe('Basic metadata creation', () => {
    it('should create simple metadata', () => {
      const metadata = createMockMetadata({
        title: 'Custom Title',
      });

      expect(metadata.title).toBe('Custom Title');
      expect(metadata.description).toBe('Test Description'); // Default value
    });

    it('should create Open Graph metadata', () => {
      const ogMetadata = createMockOpenGraph({
        title: 'My OG Title',
        images: [
          {
            url: 'https://example.com/my-image.jpg',
            width: 1200,
            height: 630,
          },
        ],
      });

      expect(ogMetadata?.title).toBe('My OG Title');
      expect(ogMetadata?.images?.[0]).toMatchObject({
        url: 'https://example.com/my-image.jpg',
        width: 1200,
        height: 630,
      });
    });

    it('should create full metadata with all properties', () => {
      const fullMetadata = createMockFullMetadata({
        title: 'Complete Page',
        keywords: ['test', 'example'],
      });

      expect(fullMetadata.title).toBe('Complete Page');
      expect(fullMetadata.openGraph).toBeDefined();
      expect(fullMetadata.twitter).toBeDefined();
      expect(fullMetadata.keywords).toEqual(['test', 'example']);
    });
  });

  describe('Metadata validation', () => {
    it('should validate Open Graph tags', () => {
      const validMetadata: Metadata = {
        openGraph: {
          title: 'Valid Title',
          description: 'Valid Description',
          url: 'https://example.com',
          images: [{ url: 'https://example.com/image.jpg' }],
        },
      };

      const errors = validateOpenGraphTags(validMetadata);
      expect(errors).toHaveLength(0);
    });

    it('should catch missing Open Graph properties', () => {
      const invalidMetadata: Metadata = {
        openGraph: {
          title: 'Title Only',
          // Missing description, url, and images
        },
      };

      const errors = validateOpenGraphTags(invalidMetadata);
      expect(errors).toContain('Missing og:description');
      expect(errors).toContain('Missing og:url');
      expect(errors).toContain('Missing og:image');
    });

    it('should validate Twitter tags', () => {
      const validMetadata: Metadata = {
        twitter: {
          card: 'summary_large_image',
          title: 'Twitter Title',
          description: 'Twitter Description',
        },
      };

      const errors = validateTwitterTags(validMetadata);
      expect(errors).toHaveLength(0);
    });

    it('should use custom matchers', () => {
      const metadata = createMockFullMetadata();
      
      // These use the custom matchers we defined
      expect(metadata).toHaveValidOpenGraph();
      expect(metadata).toHaveValidTwitterCard();
    });
  });

  describe('Testing generateMetadata functions', () => {
    // Mock generateMetadata function
    const mockGenerateMetadataFn = async ({ params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params;
      
      return {
        title: `Page ${id}`,
        description: `Description for page ${id}`,
        openGraph: {
          title: `Page ${id}`,
          description: `Description for page ${id}`,
          url: `https://example.com/page/${id}`,
          images: [{ url: `https://example.com/og/${id}.jpg` }],
        },
      };
    };

    it('should test generateMetadata with mock params', async () => {
      const params = createMockParams({ id: '123' });
      
      const metadata = await testGenerateMetadata(
        mockGenerateMetadataFn,
        { params },
        {
          title: 'Page 123',
          description: 'Description for page 123',
        }
      );

      expect(metadata.openGraph?.url).toBe('https://example.com/page/123');
    });
  });

  describe('Testing with environment variables', () => {
    setupEnvironmentMocks({
      NEXT_PUBLIC_BASE_URL: 'https://test.example.com',
      VERCEL_URL: 'test-deployment.vercel.app',
    });

    it('should use environment variables in metadata', () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fallback.com';
      
      const metadata = createMockMetadata({
        metadataBase: new URL(baseUrl),
      });

      expect(metadata.metadataBase?.toString()).toBe('https://test.example.com/');
    });
  });

  describe('Testing with fetch mocks', () => {
    beforeEach(() => {
      setupFetchMock({
        '/api/action/123': {
          id: '123',
          title: 'Test Action',
          description: 'Test Description',
        },
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should generate metadata from fetched data', async () => {
      const response = await fetch('https://example.com/api/action/123');
      const data = await response.json();

      const metadata = createMockMetadata({
        title: data.title,
        description: data.description,
      });

      expect(metadata.title).toBe('Test Action');
      expect(metadata.description).toBe('Test Description');
    });
  });

  describe('Using metadata fixtures', () => {
    it('should use minimal fixture', () => {
      const metadata = metadataFixtures.minimal;
      expect(metadata.title).toBe('Minimal Title');
      expect(metadata.openGraph).toBeUndefined();
    });

    it('should use complete fixture', () => {
      const metadata = metadataFixtures.complete;
      expect(metadata).toHaveValidOpenGraph();
      expect(metadata).toHaveValidTwitterCard();
    });
  });
});

// TypeScript support for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidOpenGraph(): R;
      toHaveValidTwitterCard(): R;
      toHaveMetaTag(property: string, content?: string): R;
    }
  }
}