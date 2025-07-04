/**
 * Example test showing how to use MSW for HTTP request mocking
 * This demonstrates testing API routes and service calls
 */

import { jest } from '@jest/globals';

describe.skip('MSW HTTP Mocking Examples', () => {
  describe('Basic API Mocking', () => {
    it('should mock a GET request to /api/actions', async () => {
      // The default handler is already set up, so we can just make the request
      const response = await fetch('/api/actions');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('actions');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.actions)).toBe(true);
    });

    it('should mock a POST request to create an action', async () => {
      const newAction = {
        title: 'Test Action',
        description: 'Test description',
        vision: 'Test vision'
      };

      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAction)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.action).toHaveProperty('id');
      expect(data.action.data.title).toBe('Test Action');
      expect(data.action.data.description).toBe('Test description');
      expect(data.action.data.vision).toBe('Test vision');
      expect(data.action.done).toBe(false);
    });

    it('should handle query parameters correctly', async () => {
      const response = await fetch('/api/actions?limit=5&offset=10&includeCompleted=true');
      const data = await response.json();

      expect(data.limit).toBe(5);
      expect(data.offset).toBe(10);
      expect(data.actions).toHaveLength(2); // Our mock returns 2 actions when includeCompleted=true
    });
  });

  describe('Custom Handler Override', () => {
    it('should allow overriding handlers for specific tests', async () => {
      // Override the default handler for this test
      mockServer.use(
        http.get('/api/actions/:id', ({ params }) => {
          return HttpResponse.json({
            action: {
              id: params.id,
              data: { title: 'Custom Test Action' },
              done: false,
              version: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          });
        })
      );

      const response = await fetch('/api/actions/test-123');
      const data = await response.json();

      expect(data.action.data.title).toBe('Custom Test Action');
      expect(data.action.id).toBe('test-123');
    });

    it('should handle PUT requests for updates', async () => {
      const updates = {
        title: 'Updated Title',
        done: true
      };

      const response = await fetch('/api/actions/action-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.action.data.title).toBe('Updated Title');
      expect(data.action.done).toBe(true);
      expect(data.action.version).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should mock 404 errors', async () => {
      const response = await fetch('/api/error/404');
      expect(response.status).toBe(404);
    });

    it('should mock 500 errors', async () => {
      const response = await fetch('/api/error/500');
      expect(response.status).toBe(500);
    });

    it('should mock network errors', async () => {
      await expect(fetch('/api/error/network')).rejects.toThrow();
    });

    it('should allow custom error responses for specific endpoints', async () => {
      // Add a custom error handler for this test
      mockServer.use(
        createErrorHandler('/api/actions/error-test', 422, 'Validation failed')
      );

      const response = await fetch('/api/actions/error-test');
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Search API Mocking', () => {
    it('should mock search requests', async () => {
      const searchQuery = {
        query: 'test search',
        searchMode: 'hybrid'
      };

      const response = await fetch('/api/actions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchQuery)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.actions).toHaveLength(1);
      expect(data.actions[0].data.title).toContain('test search');
    });
  });

  describe('Next Action API', () => {
    it('should mock next action endpoint', async () => {
      const response = await fetch('/api/actions/next');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.action).toHaveProperty('id');
      expect(data.action.data.title).toBe('Next Action');
    });

    it('should allow custom next action responses', async () => {
      mockServer.use(
        http.get('/api/actions/next', () => {
          return HttpResponse.json({
            action: {
              id: 'priority-action-1',
              data: { 
                title: 'High Priority Action',
                description: 'This needs immediate attention'
              },
              done: false,
              version: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          });
        })
      );

      const response = await fetch('/api/actions/next');
      const data = await response.json();

      expect(data.action.data.title).toBe('High Priority Action');
      expect(data.action.id).toBe('priority-action-1');
    });
  });

  describe('Completion Context API', () => {
    it('should mock completion context creation', async () => {
      const contextData = {
        actionId: 'action-123',
        implementationStory: 'Implemented the feature using TypeScript',
        impactStory: 'Users can now perform the action more efficiently',
        learningStory: 'Learned about async error handling',
        changelogVisibility: 'public'
      };

      const response = await fetch('/api/completion-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextData)
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('id');
      expect(data.actionId).toBe('action-123');
      expect(data.implementationStory).toBe('Implemented the feature using TypeScript');
      expect(data.changelogVisibility).toBe('public');
    });
  });
});