/**
 * Mocks for Next.js metadata APIs
 */

import { Metadata } from 'next';

/**
 * Mock implementation of Next.js generateMetadata
 */
export const mockGenerateMetadata = jest.fn();

/**
 * Mock Next.js router for testing pages with dynamic routes
 */
export const mockUseParams = jest.fn();
export const mockUseSearchParams = jest.fn();

/**
 * Setup mocks for Next.js navigation
 */
export const setupNavigationMocks = () => {
  jest.mock('next/navigation', () => ({
    useParams: mockUseParams,
    useSearchParams: mockUseSearchParams,
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }),
    usePathname: () => '/test-path',
  }));
};

/**
 * Mock for Next.js headers
 */
export const mockHeaders = () => {
  const headers = new Map([
    ['x-forwarded-host', 'test.com'],
    ['x-forwarded-proto', 'https'],
  ]);
  
  return {
    get: (key: string) => headers.get(key.toLowerCase()),
    forEach: headers.forEach.bind(headers),
  };
};

/**
 * Helper to test async generateMetadata functions
 */
export const testGenerateMetadata = async (
  generateMetadataFn: Function,
  props: any,
  expectedMetadata: Partial<Metadata>
) => {
  const result = await generateMetadataFn(props);
  
  // Check each expected property
  Object.entries(expectedMetadata).forEach(([key, value]) => {
    expect(result).toHaveProperty(key, value);
  });
  
  return result;
};

/**
 * Helper to create mock params for dynamic routes
 */
export const createMockParams = (params: Record<string, string>) => {
  // Next.js 15 uses Promise-based params
  return Promise.resolve(params);
};

/**
 * Helper to create mock searchParams
 */
export const createMockSearchParams = (params: Record<string, string>) => {
  return Promise.resolve(new URLSearchParams(params));
};

/**
 * Mock fetch for testing metadata that fetches data
 */
export const setupFetchMock = (responses: Record<string, any>) => {
  global.fetch = jest.fn((url) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlString.includes(pattern)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response)),
        } as Response);
      }
    }
    
    // Default 404 response
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.reject(new Error('Not found')),
      text: () => Promise.resolve('Not found'),
    } as Response);
  });
};

/**
 * Helper to test metadata inheritance
 */
export const testMetadataInheritance = (
  parentMetadata: Metadata,
  childMetadata: Metadata,
  expectedMerged: Metadata
) => {
  // Simulate Next.js metadata merging behavior
  const merged = {
    ...parentMetadata,
    ...childMetadata,
    openGraph: {
      ...parentMetadata.openGraph,
      ...childMetadata.openGraph,
    },
    twitter: {
      ...parentMetadata.twitter,
      ...childMetadata.twitter,
    },
  };
  
  expect(merged).toEqual(expectedMerged);
};

/**
 * Mock for environment variables commonly used in metadata
 */
export const setupEnvironmentMocks = (env: Record<string, string>) => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, ...env };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
};

/**
 * Helper to test metadata base URL resolution
 */
export const testMetadataBaseUrl = (
  metadata: Metadata,
  expectedBaseUrl: string
) => {
  if (metadata.metadataBase) {
    expect(metadata.metadataBase.toString()).toBe(expectedBaseUrl);
  } else {
    throw new Error('metadataBase is not defined');
  }
};

/**
 * Helper to test dynamic OG image generation
 */
export const testDynamicOgImage = async (
  imageUrl: string,
  expectedParams: Record<string, any>
) => {
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split('/');
  
  // Extract dynamic params from URL
  const params: Record<string, string> = {};
  pathParts.forEach((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      const paramName = part.slice(1, -1);
      params[paramName] = pathParts[index];
    }
  });
  
  // Verify expected params
  Object.entries(expectedParams).forEach(([key, value]) => {
    expect(params[key]).toBe(value);
  });
};

/**
 * Clean up all mocks
 */
export const cleanupMetadataMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};