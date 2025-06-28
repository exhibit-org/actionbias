/**
 * Test utilities for Open Graph and metadata testing
 * 
 * This module exports all the test utilities for easy importing in test files.
 */

// Metadata test utilities
export {
  createMockMetadata,
  createMockOpenGraph,
  createMockTwitter,
  createMockFullMetadata,
  createMockChangelogMetadata,
  metadataFixtures,
  extractMetaTags,
  validateOpenGraphTags,
  validateTwitterTags,
  createMockGenerateMetadata,
  metadataMatchers,
  setupMetadataMatchers,
} from './metadata-test-utils';

// Next.js metadata mocks
export {
  mockGenerateMetadata,
  mockUseParams,
  mockUseSearchParams,
  setupNavigationMocks,
  mockHeaders,
  testGenerateMetadata,
  createMockParams,
  createMockSearchParams,
  setupFetchMock,
  testMetadataInheritance,
  setupEnvironmentMocks,
  testMetadataBaseUrl,
  testDynamicOgImage,
  cleanupMetadataMocks,
} from './next-metadata-mocks';

// OG image test utilities
export {
  mockImageResponse,
  setupOgImageMocks,
  testOgImageEndpoint,
  mockOgFonts,
  extractOgImageText,
  testOgImageError,
  createMockOgImageData,
  verifyOgImageDimensions,
  testOgImageCaching,
  cleanupOgImageMocks,
} from './og-image-test-utils';

// Type exports
export type { Metadata } from 'next';