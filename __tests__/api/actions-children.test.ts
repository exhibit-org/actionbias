import { NextRequest } from 'next/server';
import { POST } from '../../app/api/actions/family/route';
import { ActionsService } from '../../lib/services/actions';

// Mock the ActionsService
jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    addFamilyAction: jest.fn(),
  },
}));

const mockActionsService = ActionsService as jest.Mocked<typeof ActionsService>;

// Helper function to create a mock NextRequest
function createMockRequest(body: any): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe('/api/actions/family', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST', () => {
    it('should successfully create a child action with valid data', async () => {
      const mockResult = {
        action: {
          id: 'child-action-id',
          data: { title: 'Child Action' },
          done: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        parent: {
          id: 'parent-id',
          data: { title: 'Parent Action' },
          done: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        edge: {
          src: 'parent-id',
          dst: 'child-action-id',
          kind: 'child',
        }
      };

      mockActionsService.addFamilyAction.mockResolvedValue(mockResult);

      const request = createMockRequest({
        title: 'Child Action',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockResult,
      });

      expect(mockActionsService.addFamilyAction).toHaveBeenCalledWith({
        title: 'Child Action',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should return 400 for missing title', async () => {
      const request = createMockRequest({
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
      expect(mockActionsService.addFamilyAction).not.toHaveBeenCalled();
    });

    it('should return 400 for empty title', async () => {
      const request = createMockRequest({
        title: '',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('String must contain at least 1 character(s)');
      expect(mockActionsService.addFamilyAction).not.toHaveBeenCalled();
    });

    it('should return 400 for missing parent_id', async () => {
      const request = createMockRequest({
        title: 'Child Action',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
      expect(mockActionsService.addFamilyAction).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid parent_id UUID', async () => {
      const request = createMockRequest({
        title: 'Child Action',
        parent_id: 'invalid-uuid',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid uuid');
      expect(mockActionsService.addFamilyAction).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockActionsService.addFamilyAction.mockRejectedValue(new Error('Family action not found'));

      const request = createMockRequest({
        title: 'Child Action',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Family action not found');
    });

    it('should handle non-Error exceptions', async () => {
      mockActionsService.addFamilyAction.mockRejectedValue('String error');

      const request = createMockRequest({
        title: 'Child Action',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unknown error');
    });

    it('should handle JSON parsing errors', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });

    it('should include optional description and vision fields', async () => {
      const mockResult = {
        action: {
          id: 'child-action-id',
          data: { 
            title: 'Child Action',
            description: 'Child description',
            vision: 'Child vision'
          },
          done: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        parent: {
          id: 'parent-id',
          data: { title: 'Parent Action' },
          done: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        edge: {
          src: 'parent-id',
          dst: 'child-action-id',
          kind: 'child',
        }
      };

      mockActionsService.addFamilyAction.mockResolvedValue(mockResult);

      const request = createMockRequest({
        title: 'Child Action',
        description: 'Child description',
        vision: 'Child vision',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockActionsService.addFamilyAction).toHaveBeenCalledWith({
        title: 'Child Action',
        description: 'Child description',
        vision: 'Child vision',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
      });
    });
  });
});