/**
 * Mock Service Worker (MSW) setup for HTTP request mocking
 * 
 * This provides a clean way to mock API endpoints for testing
 * without relying on actual HTTP requests.
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Types for mock responses
export type MockAction = {
  id: string;
  data: {
    title: string;
    description?: string;
    vision?: string;
  };
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  deleted_at?: string;
};

export type MockActionResponse = {
  action: MockAction;
  edges?: Array<{
    id: string;
    src: string;
    dst: string;
    kind: string;
    created_at: string;
  }>;
};

export type MockListResponse = {
  actions: MockAction[];
  total: number;
  limit: number;
  offset: number;
};

// Default mock handlers for common API endpoints
export const defaultHandlers = [
  // Actions API - Create
  http.post('/api/actions', async ({ request }) => {
    const body = await request.json() as any;
    const newAction: MockAction = {
      id: `action-${Math.random().toString(36).substring(7)}`,
      data: {
        title: body.title,
        description: body.description,
        vision: body.vision,
      },
      done: false,
      version: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_id: body.parent_id,
    };

    return HttpResponse.json({ action: newAction });
  }),

  // Actions API - List
  http.get('/api/actions', ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

    // Mock some actions
    const mockActions: MockAction[] = [
      {
        id: 'action-1',
        data: { title: 'Test Action 1' },
        done: false,
        version: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'action-2',
        data: { title: 'Test Action 2' },
        done: true,
        version: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const filteredActions = includeCompleted 
      ? mockActions 
      : mockActions.filter(action => !action.done);

    const paginatedActions = filteredActions.slice(offset, offset + limit);

    return HttpResponse.json({
      actions: paginatedActions,
      total: filteredActions.length,
      limit,
      offset,
    });
  }),

  // Actions API - Get single
  http.get('/api/actions/:id', ({ params }) => {
    const mockAction: MockAction = {
      id: params.id as string,
      data: { title: 'Test Action', description: 'Test description' },
      done: false,
      version: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ action: mockAction });
  }),

  // Actions API - Update
  http.put('/api/actions/:id', async ({ params, request }) => {
    const body = await request.json() as any;
    const updatedAction: MockAction = {
      id: params.id as string,
      data: {
        title: body.title || 'Updated Action',
        description: body.description,
        vision: body.vision,
      },
      done: body.done || false,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ action: updatedAction });
  }),

  // Actions API - Delete
  http.delete('/api/actions/:id', ({ params }) => {
    return HttpResponse.json({ 
      success: true, 
      deletedId: params.id 
    });
  }),

  // Next action API
  http.get('/api/actions/next', () => {
    const nextAction: MockAction = {
      id: 'next-action-1',
      data: { title: 'Next Action', description: 'Next action to work on' },
      done: false,
      version: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json({ action: nextAction });
  }),

  // Search API
  http.post('/api/actions/search', async ({ request }) => {
    const body = await request.json() as any;
    const searchResults: MockAction[] = [
      {
        id: 'search-result-1',
        data: { title: `Result for: ${body.query}` },
        done: false,
        version: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return HttpResponse.json({
      actions: searchResults,
      total: searchResults.length,
    });
  }),

  // Completion contexts API
  http.post('/api/completion-contexts', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      id: `context-${Math.random().toString(36).substring(7)}`,
      actionId: body.actionId,
      implementationStory: body.implementationStory,
      impactStory: body.impactStory,
      learningStory: body.learningStory,
      changelogVisibility: body.changelogVisibility || 'team',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),

  // Error responses for testing error handling
  http.get('/api/error/500', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get('/api/error/404', () => {
    return new HttpResponse(null, { status: 404 });
  }),

  http.get('/api/error/network', () => {
    return HttpResponse.error();
  }),
];

// Create the server instance
export const mockServer = setupServer(...defaultHandlers);

// Utility functions for test setup
export const startMockServer = () => {
  mockServer.listen({
    onUnhandledRequest: 'warn',
  });
};

export const stopMockServer = () => {
  mockServer.close();
};

export const resetMockServer = () => {
  mockServer.resetHandlers();
};

// Custom response builders for specific test scenarios
export const createMockActionResponse = (overrides: Partial<MockAction> = {}): MockActionResponse => {
  const action: MockAction = {
    id: `action-${Math.random().toString(36).substring(7)}`,
    data: {
      title: 'Mock Action',
      description: 'Mock description',
      vision: 'Mock vision',
    },
    done: false,
    version: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };

  return { action };
};

export const createMockListResponse = (actions: MockAction[], options: {
  total?: number;
  limit?: number;
  offset?: number;
} = {}): MockListResponse => {
  return {
    actions,
    total: options.total ?? actions.length,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
  };
};

// Handler builders for common patterns
export const createSuccessHandler = (endpoint: string, response: any) => {
  return http.get(endpoint, () => HttpResponse.json(response));
};

export const createErrorHandler = (endpoint: string, status: number, message?: string) => {
  return http.get(endpoint, () => {
    return new HttpResponse(
      message ? JSON.stringify({ error: message }) : null,
      { status }
    );
  });
};

export const createDelayedHandler = (endpoint: string, response: any, delay: number) => {
  return http.get(endpoint, async () => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return HttpResponse.json(response);
  });
};