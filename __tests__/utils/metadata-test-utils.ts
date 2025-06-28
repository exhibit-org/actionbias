import { Metadata } from 'next';

/**
 * Mock factory for creating test metadata objects
 */
export const createMockMetadata = (overrides?: Partial<Metadata>): Metadata => {
  return {
    title: 'Test Title',
    description: 'Test Description',
    ...overrides,
  };
};

/**
 * Mock factory for creating Open Graph metadata
 */
export const createMockOpenGraph = (overrides?: Partial<Metadata['openGraph']>): Metadata['openGraph'] => {
  return {
    title: 'Test OG Title',
    description: 'Test OG Description',
    url: 'https://test.com',
    siteName: 'Test Site',
    images: [
      {
        url: 'https://test.com/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Test OG Image',
      },
    ],
    locale: 'en_US',
    type: 'website',
    ...overrides,
  };
};

/**
 * Mock factory for creating Twitter metadata
 */
export const createMockTwitter = (overrides?: Partial<Metadata['twitter']>): Metadata['twitter'] => {
  return {
    card: 'summary_large_image',
    title: 'Test Twitter Title',
    description: 'Test Twitter Description',
    images: ['https://test.com/twitter.jpg'],
    creator: '@testcreator',
    ...overrides,
  };
};

/**
 * Mock factory for creating full metadata with Open Graph and Twitter
 */
export const createMockFullMetadata = (overrides?: Partial<Metadata>): Metadata => {
  return {
    title: 'Test Full Title',
    description: 'Test Full Description',
    metadataBase: new URL('https://test.com'),
    openGraph: createMockOpenGraph(),
    twitter: createMockTwitter(),
    ...overrides,
  };
};

/**
 * Mock factory for creating changelog metadata
 */
export const createMockChangelogMetadata = (
  actionId: string,
  overrides?: Partial<Metadata>
): Metadata => {
  return {
    title: `Action ${actionId} - Test Changelog`,
    description: `Test changelog entry for action ${actionId}`,
    openGraph: {
      title: `Action ${actionId} - Test Changelog`,
      description: `Test changelog entry for action ${actionId}`,
      url: `https://test.com/log/${actionId}`,
      images: [
        {
          url: `https://test.com/api/og/log/${actionId}`,
          width: 1200,
          height: 630,
          alt: `Changelog for action ${actionId}`,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Action ${actionId} - Test Changelog`,
      description: `Test changelog entry for action ${actionId}`,
      images: [`https://test.com/api/og/log/${actionId}`],
    },
    ...overrides,
  };
};

/**
 * Test fixtures for common scenarios
 */
export const metadataFixtures = {
  minimal: {
    title: 'Minimal Title',
    description: 'Minimal Description',
  },
  withOpenGraph: {
    title: 'OG Title',
    description: 'OG Description',
    openGraph: {
      title: 'OG Title',
      description: 'OG Description',
      images: [{ url: 'https://example.com/og.jpg' }],
    },
  },
  withTwitter: {
    title: 'Twitter Title',
    description: 'Twitter Description',
    twitter: {
      card: 'summary',
      title: 'Twitter Title',
      description: 'Twitter Description',
    },
  },
  complete: createMockFullMetadata(),
};

/**
 * Helper to extract meta tags from rendered HTML
 */
export const extractMetaTags = (container: HTMLElement): Record<string, string> => {
  const metaTags: Record<string, string> = {};
  const metaElements = container.querySelectorAll('meta');
  
  metaElements.forEach((meta) => {
    const property = meta.getAttribute('property');
    const name = meta.getAttribute('name');
    const content = meta.getAttribute('content');
    
    if (property && content) {
      metaTags[property] = content;
    } else if (name && content) {
      metaTags[name] = content;
    }
  });
  
  return metaTags;
};

/**
 * Validation helper to check required Open Graph properties
 */
export const validateOpenGraphTags = (metadata: Metadata): string[] => {
  const errors: string[] = [];
  
  if (!metadata.openGraph) {
    errors.push('Missing openGraph property');
    return errors;
  }
  
  const og = metadata.openGraph;
  
  // Check required OG properties
  if (!og.title) errors.push('Missing og:title');
  if (!og.description) errors.push('Missing og:description');
  if (!og.url) errors.push('Missing og:url');
  if (!og.images || og.images.length === 0) errors.push('Missing og:image');
  
  // Validate image properties
  if (og.images && og.images.length > 0) {
    og.images.forEach((image, index) => {
      if (typeof image === 'string') {
        // String format is valid
      } else {
        if (!image.url) errors.push(`Missing url for og:image[${index}]`);
        if (image.width && typeof image.width !== 'number') {
          errors.push(`Invalid width for og:image[${index}]`);
        }
        if (image.height && typeof image.height !== 'number') {
          errors.push(`Invalid height for og:image[${index}]`);
        }
      }
    });
  }
  
  return errors;
};

/**
 * Validation helper to check required Twitter Card properties
 */
export const validateTwitterTags = (metadata: Metadata): string[] => {
  const errors: string[] = [];
  
  if (!metadata.twitter) {
    errors.push('Missing twitter property');
    return errors;
  }
  
  const twitter = metadata.twitter;
  
  // Check required Twitter properties
  if (!twitter.card) errors.push('Missing twitter:card');
  if (!twitter.title) errors.push('Missing twitter:title');
  if (!twitter.description) errors.push('Missing twitter:description');
  
  // Validate card type
  const validCardTypes = ['summary', 'summary_large_image', 'app', 'player'];
  if (twitter.card && !validCardTypes.includes(twitter.card)) {
    errors.push(`Invalid twitter:card type: ${twitter.card}`);
  }
  
  return errors;
};

/**
 * Helper to create a mock generateMetadata function for testing
 */
export const createMockGenerateMetadata = (
  mockData: Record<string, Metadata>
) => {
  return async ({ params }: { params: any }) => {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    return mockData[id] || createMockMetadata({ title: `Not Found - ${id}` });
  };
};

/**
 * Custom Jest matchers for metadata testing
 */
export const metadataMatchers = {
  toHaveValidOpenGraph(received: Metadata) {
    const errors = validateOpenGraphTags(received);
    return {
      pass: errors.length === 0,
      message: () => 
        errors.length === 0
          ? 'Expected metadata to have invalid Open Graph tags'
          : `Expected metadata to have valid Open Graph tags. Errors: ${errors.join(', ')}`,
    };
  },
  
  toHaveValidTwitterCard(received: Metadata) {
    const errors = validateTwitterTags(received);
    return {
      pass: errors.length === 0,
      message: () =>
        errors.length === 0
          ? 'Expected metadata to have invalid Twitter tags'
          : `Expected metadata to have valid Twitter tags. Errors: ${errors.join(', ')}`,
    };
  },
  
  toHaveMetaTag(received: HTMLElement, property: string, content?: string) {
    const metaTags = extractMetaTags(received);
    const hasTag = property in metaTags;
    const contentMatches = content === undefined || metaTags[property] === content;
    
    return {
      pass: hasTag && contentMatches,
      message: () => {
        if (!hasTag) {
          return `Expected to find meta tag with property "${property}"`;
        }
        if (!contentMatches) {
          return `Expected meta tag "${property}" to have content "${content}", but found "${metaTags[property]}"`;
        }
        return `Expected not to find meta tag with property "${property}"`;
      },
    };
  },
};

/**
 * Setup function to add custom matchers to Jest
 */
export const setupMetadataMatchers = () => {
  expect.extend(metadataMatchers);
};