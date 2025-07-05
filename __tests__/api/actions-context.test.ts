import { NextRequest } from 'next/server';
import { GET } from '../../app/api/actions/[id]/context/route';
import { ContextService } from '../../lib/services/context';

// Mock the ContextService
jest.mock('../../lib/services/context');

const mockContextService = ContextService as jest.Mocked<typeof ContextService>;

describe('/api/actions/[id]/context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return action context for valid UUID', async () => {
    const actionId = '123e4567-e89b-12d3-a456-426614174000';
    const mockContext = {
      action: {
        id: actionId,
        title: 'Test Action',
        description: 'Test description',
        vision: null,
        done: false,
        version: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      relationships: {
        ancestors: [],
        children: [],
        dependencies: [],
        dependents: [],
        siblings: [],
      },
      relationship_flags: {},
    };

    mockContextService.getActionContext.mockResolvedValue(mockContext);

    const request = new NextRequest('http://localhost:3000/api/actions/123e4567-e89b-12d3-a456-426614174000/context');
    const params = Promise.resolve({ id: actionId });
    
    const response = await GET(request, { params });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockContext);
    expect(mockContextService.getActionContext).toHaveBeenCalledWith(actionId);
  });

  it('should return 400 for invalid UUID format', async () => {
    const request = new NextRequest('http://localhost:3000/api/actions/invalid-id/context');
    const params = Promise.resolve({ id: 'invalid-id' });
    
    const response = await GET(request, { params });
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid action ID format');
    expect(mockContextService.getActionContext).not.toHaveBeenCalled();
  });

  it('should return 500 when ContextService throws error', async () => {
    const actionId = '123e4567-e89b-12d3-a456-426614174000';
    mockContextService.getActionContext.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/actions/123e4567-e89b-12d3-a456-426614174000/context');
    const params = Promise.resolve({ id: actionId });
    
    const response = await GET(request, { params });
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
  });
});