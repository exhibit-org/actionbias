/**
 * Test utilities for Open Graph image generation
 */

import { ImageResponse } from '@vercel/og';

/**
 * Mock @vercel/og ImageResponse
 */
export const mockImageResponse = () => {
  const MockImageResponse = jest.fn().mockImplementation((element, options) => {
    return {
      // Mock Response properties
      headers: new Headers({
        'content-type': 'image/png',
        'cache-control': options?.headers?.['cache-control'] || 'public, max-age=31536000',
      }),
      status: options?.status || 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      type: 'basic',
      url: '',
      clone: jest.fn(),
      body: null,
      bodyUsed: false,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      blob: jest.fn().mockResolvedValue(new Blob()),
      formData: jest.fn().mockResolvedValue(new FormData()),
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue('mock-image-data'),
      // Store the rendered element for testing
      _element: element,
      _options: options,
    };
  });

  return MockImageResponse;
};

/**
 * Setup mock for @vercel/og module
 */
export const setupOgImageMocks = () => {
  jest.mock('@vercel/og', () => ({
    ImageResponse: mockImageResponse(),
  }));
};

/**
 * Helper to test OG image endpoint
 */
export const testOgImageEndpoint = async (
  endpoint: Function,
  params: any,
  expectedProps: {
    width?: number;
    height?: number;
    title?: string;
    description?: string;
    cacheControl?: string;
  }
) => {
  const response = await endpoint(params);
  
  // Check response properties
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/png');
  
  if (expectedProps.cacheControl) {
    expect(response.headers.get('cache-control')).toBe(expectedProps.cacheControl);
  }
  
  // Check rendered element if using mocked ImageResponse
  if ('_element' in response && '_options' in response) {
    const options = (response as any)._options;
    
    if (expectedProps.width) {
      expect(options.width).toBe(expectedProps.width);
    }
    if (expectedProps.height) {
      expect(options.height).toBe(expectedProps.height);
    }
  }
  
  return response;
};

/**
 * Mock fonts for OG image generation
 */
export const mockOgFonts = () => {
  global.fetch = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('fonts.googleapis.com')) {
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      } as Response);
    }
    return Promise.reject(new Error('Not a font URL'));
  });
};

/**
 * Helper to extract text content from OG image JSX
 */
export const extractOgImageText = (element: any): string[] => {
  const texts: string[] = [];
  
  const traverse = (node: any) => {
    if (typeof node === 'string') {
      texts.push(node);
    } else if (node?.props?.children) {
      const children = Array.isArray(node.props.children) 
        ? node.props.children 
        : [node.props.children];
      children.forEach(traverse);
    }
  };
  
  traverse(element);
  return texts;
};

/**
 * Helper to test OG image error handling
 */
export const testOgImageError = async (
  endpoint: Function,
  params: any,
  expectedError: {
    status: number;
    message: string;
  }
) => {
  try {
    const response = await endpoint(params);
    
    if (response.status !== expectedError.status) {
      throw new Error(`Expected status ${expectedError.status}, got ${response.status}`);
    }
    
    const text = await response.text();
    expect(text).toContain(expectedError.message);
  } catch (error) {
    // If the endpoint throws instead of returning an error response
    expect(error).toBeDefined();
    if (error instanceof Error) {
      expect(error.message).toContain(expectedError.message);
    }
  }
};

/**
 * Mock data for testing OG image generation
 */
export const createMockOgImageData = (overrides?: any) => {
  return {
    title: 'Test OG Image Title',
    description: 'Test OG Image Description',
    author: 'Test Author',
    date: new Date('2024-01-01').toISOString(),
    readTime: '5 min read',
    tags: ['test', 'mock', 'data'],
    ...overrides,
  };
};

/**
 * Helper to verify OG image dimensions
 */
export const verifyOgImageDimensions = (
  response: any,
  expectedWidth: number,
  expectedHeight: number
) => {
  if ('_options' in response) {
    const options = (response as any)._options;
    expect(options.width).toBe(expectedWidth);
    expect(options.height).toBe(expectedHeight);
  }
};

/**
 * Helper to test OG image caching
 */
export const testOgImageCaching = async (
  endpoint: Function,
  params: any,
  expectedCacheControl: string = 'public, max-age=31536000, immutable'
) => {
  const response = await endpoint(params);
  const cacheControl = response.headers.get('cache-control');
  expect(cacheControl).toBe(expectedCacheControl);
};

/**
 * Clean up OG image mocks
 */
export const cleanupOgImageMocks = () => {
  jest.unmock('@vercel/og');
  if (global.fetch && jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.Mock).mockRestore();
  }
};