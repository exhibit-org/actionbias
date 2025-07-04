/**
 * Example test showing how to mock fetch requests for API testing
 * This demonstrates a simpler approach to HTTP mocking without MSW
 */

import { jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Fetch Mocking Examples', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('API Response Mocking', () => {
    it('should mock a successful API response', async () => {
      const mockResponse = {
        action: {
          id: 'action-123',
          data: { title: 'Test Action' },
          done: false,
          version: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const response = await fetch('/api/actions/123');
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/actions/123');
      expect(response.ok).toBe(true);
      expect(data.action.id).toBe('action-123');
      expect(data.action.data.title).toBe('Test Action');
    });

    it('should mock a POST request with request body', async () => {
      const mockResponse = {
        action: {
          id: 'new-action-456',
          data: { title: 'Created Action', description: 'New description' },
          done: false,
          version: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const requestBody = {
        title: 'Created Action',
        description: 'New description'
      };

      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledWith('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      expect(response.status).toBe(201);
      expect(data.action.data.title).toBe('Created Action');
    });

    it('should mock error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Action not found' }),
      } as Response);

      const response = await fetch('/api/actions/nonexistent');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(data.error).toBe('Action not found');
    });

    it('should mock network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/actions')).rejects.toThrow('Network error');
    });
  });

  describe('List API Mocking', () => {
    it('should mock paginated list responses', async () => {
      const mockListResponse = {
        actions: [
          {
            id: 'action-1',
            data: { title: 'Action 1' },
            done: false,
            version: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'action-2',
            data: { title: 'Action 2' },
            done: true,
            version: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ],
        total: 2,
        limit: 20,
        offset: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockListResponse),
      } as Response);

      const response = await fetch('/api/actions?limit=20&offset=0');
      const data = await response.json();

      expect(data.actions).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.actions[0].data.title).toBe('Action 1');
      expect(data.actions[1].done).toBe(true);
    });
  });

  describe('Search API Mocking', () => {
    it('should mock search responses', async () => {
      const searchResults = {
        actions: [
          {
            id: 'search-result-1',
            data: { title: 'Matching Action' },
            done: false,
            version: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ],
        total: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(searchResults),
      } as Response);

      const searchQuery = { query: 'test search', searchMode: 'hybrid' };
      const response = await fetch('/api/actions/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchQuery)
      });
      const data = await response.json();

      expect(data.actions).toHaveLength(1);
      expect(data.actions[0].data.title).toBe('Matching Action');
    });
  });

  describe('Multiple API Call Mocking', () => {
    it('should handle multiple different API calls', async () => {
      // Mock the first call - get action
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          action: { id: 'action-1', data: { title: 'First Action' } }
        }),
      } as Response);

      // Mock the second call - update action  
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          action: { id: 'action-1', data: { title: 'Updated Action' }, done: true }
        }),
      } as Response);

      // Make first request
      const getResponse = await fetch('/api/actions/action-1');
      const getResult = await getResponse.json();
      expect(getResult.action.data.title).toBe('First Action');

      // Make second request
      const updateResponse = await fetch('/api/actions/action-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Action', done: true })
      });
      const updateResult = await updateResponse.json();
      expect(updateResult.action.data.title).toBe('Updated Action');
      expect(updateResult.action.done).toBe(true);

      // Verify both calls were made
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility Functions for Common Patterns', () => {
    const createMockSuccessResponse = (data: any) => ({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response);

    const createMockErrorResponse = (status: number, error: string) => ({
      ok: false,
      status,
      json: () => Promise.resolve({ error }),
    } as Response);

    it('should use helper functions for cleaner test setup', async () => {
      const mockData = { message: 'Success' };
      mockFetch.mockResolvedValueOnce(createMockSuccessResponse(mockData));

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.message).toBe('Success');
    });

    it('should use error helper for testing error scenarios', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse(422, 'Validation failed'));

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(422);
      expect(data.error).toBe('Validation failed');
    });
  });
});