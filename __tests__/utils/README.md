# Metadata Test Utilities

This directory contains reusable test utilities for testing Open Graph metadata, Twitter cards, and dynamic OG image generation in Next.js applications.

## Available Utilities

### 1. `metadata-test-utils.ts`
Core utilities for creating and validating metadata objects.

#### Mock Factories
- `createMockMetadata()` - Create basic metadata
- `createMockOpenGraph()` - Create Open Graph metadata
- `createMockTwitter()` - Create Twitter card metadata
- `createMockFullMetadata()` - Create complete metadata with all properties
- `createMockChangelogMetadata()` - Create changelog-specific metadata

#### Validation Helpers
- `validateOpenGraphTags()` - Validate Open Graph properties
- `validateTwitterTags()` - Validate Twitter card properties
- `extractMetaTags()` - Extract meta tags from rendered HTML

#### Custom Jest Matchers
- `toHaveValidOpenGraph()` - Assert valid Open Graph metadata
- `toHaveValidTwitterCard()` - Assert valid Twitter metadata
- `toHaveMetaTag()` - Assert presence of specific meta tags

### 2. `next-metadata-mocks.ts`
Utilities for mocking Next.js metadata APIs.

#### Mocking Functions
- `setupNavigationMocks()` - Mock Next.js navigation hooks
- `setupFetchMock()` - Mock fetch requests for metadata
- `setupEnvironmentMocks()` - Mock environment variables
- `createMockParams()` - Create mock params for dynamic routes
- `testGenerateMetadata()` - Test async generateMetadata functions

### 3. `og-image-test-utils.ts`
Utilities for testing Open Graph image generation.

#### OG Image Testing
- `setupOgImageMocks()` - Mock @vercel/og ImageResponse
- `testOgImageEndpoint()` - Test OG image endpoints
- `extractOgImageText()` - Extract text from rendered images
- `verifyOgImageDimensions()` - Verify image dimensions
- `testOgImageCaching()` - Test caching headers
- `mockOgFonts()` - Mock font loading

## Usage Examples

### Basic Metadata Testing

```typescript
import { createMockMetadata, validateOpenGraphTags } from '../utils/metadata-test-utils';

describe('Page Metadata', () => {
  it('should have valid metadata', () => {
    const metadata = createMockMetadata({
      title: 'My Page',
      description: 'My page description',
      openGraph: {
        title: 'My Page',
        description: 'My page description',
        url: 'https://example.com/my-page',
        images: [{ url: 'https://example.com/og.jpg' }],
      },
    });

    const errors = validateOpenGraphTags(metadata);
    expect(errors).toHaveLength(0);
  });
});
```

### Testing Dynamic Metadata

```typescript
import { testGenerateMetadata, createMockParams } from '../utils/next-metadata-mocks';

describe('Dynamic Page', () => {
  it('should generate correct metadata', async () => {
    const generateMetadata = async ({ params }) => {
      const { id } = await params;
      return {
        title: `Item ${id}`,
        description: `Details for item ${id}`,
      };
    };

    await testGenerateMetadata(
      generateMetadata,
      { params: createMockParams({ id: '123' }) },
      {
        title: 'Item 123',
        description: 'Details for item 123',
      }
    );
  });
});
```

### Testing OG Images

```typescript
import { 
  setupOgImageMocks, 
  testOgImageEndpoint,
  extractOgImageText 
} from '../utils/og-image-test-utils';

describe('OG Image', () => {
  beforeEach(() => {
    setupOgImageMocks();
  });

  it('should generate OG image', async () => {
    const ogEndpoint = async ({ params }) => {
      const { ImageResponse } = await import('@vercel/og');
      return new ImageResponse(
        <div>
          <h1>Title: {params.title}</h1>
        </div>,
        { width: 1200, height: 630 }
      );
    };

    const response = await testOgImageEndpoint(
      ogEndpoint,
      { params: { title: 'Test' } },
      { width: 1200, height: 630 }
    );

    const texts = extractOgImageText(response._element);
    expect(texts).toContain('Title: Test');
  });
});
```

### Using Custom Matchers

```typescript
import { setupMetadataMatchers } from '../utils/metadata-test-utils';

// In your test setup file
beforeAll(() => {
  setupMetadataMatchers();
});

// In your tests
it('should have valid metadata', () => {
  const metadata = getPageMetadata();
  
  expect(metadata).toHaveValidOpenGraph();
  expect(metadata).toHaveValidTwitterCard();
});
```

## Best Practices

1. **Always clean up mocks**: Use `afterEach()` to clean up mocks and restore original implementations.

2. **Test error cases**: Include tests for missing data, invalid inputs, and error responses.

3. **Verify caching**: Test that appropriate cache headers are set for OG images.

4. **Check responsive images**: Ensure OG images work at different dimensions if supported.

5. **Environment variables**: Test with different environment configurations.

6. **Type safety**: Use TypeScript types for metadata objects to catch errors at compile time.

## Common Test Scenarios

### 1. Testing a Page with Static Metadata
```typescript
import { metadata } from '@/app/about/page';
import { validateOpenGraphTags } from '../utils/metadata-test-utils';

test('about page metadata', () => {
  expect(metadata.title).toBe('About - ActionBias');
  expect(validateOpenGraphTags(metadata)).toHaveLength(0);
});
```

### 2. Testing Dynamic Routes
```typescript
test('dynamic route metadata', async () => {
  const metadata = await generateMetadata({
    params: Promise.resolve({ id: 'abc123' }),
  });
  
  expect(metadata.title).toContain('abc123');
  expect(metadata.openGraph?.url).toBe('https://example.com/items/abc123');
});
```

### 3. Testing Metadata Inheritance
```typescript
test('child inherits parent metadata', () => {
  const parent = { title: 'Parent', robots: 'index,follow' };
  const child = { title: 'Child' };
  const merged = { ...parent, ...child };
  
  expect(merged.title).toBe('Child');
  expect(merged.robots).toBe('index,follow');
});
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@vercel/og'"**
   - Make sure to mock the module before importing components that use it
   - Use `setupOgImageMocks()` in `beforeEach()`

2. **"ReferenceError: fetch is not defined"**
   - Use `setupFetchMock()` to mock fetch requests
   - Or use `global.fetch = jest.fn()` for custom mocking

3. **"TypeError: Cannot read property 'get' of undefined"**
   - Ensure headers are properly mocked when testing metadata that uses headers
   - Use `mockHeaders()` utility

4. **Async metadata not resolving**
   - Remember that Next.js 15 params are Promises
   - Always await params before using them

## Contributing

When adding new test utilities:
1. Follow the existing patterns for consistency
2. Add TypeScript types for all functions
3. Include JSDoc comments explaining usage
4. Add examples to this README
5. Write tests for the test utilities themselves