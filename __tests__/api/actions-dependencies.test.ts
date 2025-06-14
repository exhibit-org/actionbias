import { NextRequest } from 'next/server';
import { POST, DELETE } from '../../app/api/actions/dependencies/route';
import { ActionsService } from '../../lib/services/actions';

// Mock the ActionsService
jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    addDependency: jest.fn(),
    removeDependency: jest.fn(),
  },
}));

const mockActionsService = ActionsService as jest.Mocked<typeof ActionsService>;

// Helper function to create a mock NextRequest
function createMockRequest(body: any): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe('/api/actions/dependencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST (add dependency)', () => {
    it('should successfully add a dependency with valid data', async () => {
      const mockResult = {
        src: 'dependency-id',
        dst: 'action-id',
        kind: 'depends_on',
        createdAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.addDependency.mockResolvedValue(mockResult);

      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockResult,
      });

      expect(mockActionsService.addDependency).toHaveBeenCalledWith({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });
    });

    it('should return 400 for missing action_id', async () => {
      const request = createMockRequest({
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
      expect(mockActionsService.addDependency).not.toHaveBeenCalled();
    });

    it('should return 400 for missing depends_on_id', async () => {
      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
      expect(mockActionsService.addDependency).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid action_id UUID', async () => {
      const request = createMockRequest({
        action_id: 'invalid-uuid',
        depends_on_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid uuid');
      expect(mockActionsService.addDependency).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid depends_on_id UUID', async () => {
      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: 'invalid-uuid',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid uuid');
      expect(mockActionsService.addDependency).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockActionsService.addDependency.mockRejectedValue(new Error('Circular dependency detected'));

      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Circular dependency detected');
    });

    it('should handle non-Error exceptions', async () => {
      mockActionsService.addDependency.mockRejectedValue('String error');

      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
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
  });

  describe('DELETE (remove dependency)', () => {
    it('should successfully remove a dependency with valid data', async () => {
      const mockResult = {
        action: {
          id: 'action-id',
          data: { title: 'Action' },
          done: false,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        depends_on: {
          id: 'dependency-id',
          data: { title: 'Dependency' },
          done: true,
          version: 1,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        deleted_edge: {
          src: 'dependency-id',
          dst: 'action-id',
          kind: 'depends_on',
        }
      };

      mockActionsService.removeDependency.mockResolvedValue(mockResult);

      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: mockResult,
      });

      expect(mockActionsService.removeDependency).toHaveBeenCalledWith({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });
    });

    it('should return 400 for missing action_id', async () => {
      const request = createMockRequest({
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
      expect(mockActionsService.removeDependency).not.toHaveBeenCalled();
    });

    it('should return 400 for missing depends_on_id', async () => {
      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Required');
      expect(mockActionsService.removeDependency).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid action_id UUID', async () => {
      const request = createMockRequest({
        action_id: 'invalid-uuid',
        depends_on_id: '123e4567-e89b-12d3-a456-426614174000',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid uuid');
      expect(mockActionsService.removeDependency).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid depends_on_id UUID', async () => {
      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: 'invalid-uuid',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid uuid');
      expect(mockActionsService.removeDependency).not.toHaveBeenCalled();
    });

    it('should handle service errors for non-existent dependency', async () => {
      mockActionsService.removeDependency.mockRejectedValue(new Error('No dependency found: Action does not depend on Dependency'));

      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No dependency found: Action does not depend on Dependency');
    });

    it('should handle non-Error exceptions', async () => {
      mockActionsService.removeDependency.mockRejectedValue('String error');

      const request = createMockRequest({
        action_id: '123e4567-e89b-12d3-a456-426614174000',
        depends_on_id: '987fcdeb-51a2-43d7-8c3f-123456789abc',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unknown error');
    });

    it('should handle JSON parsing errors', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
      } as unknown as NextRequest;

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON');
    });
  });
});