import { GET, POST } from '../../app/api/completion-contexts/route';
import { GET as GetById, PUT, DELETE } from '../../app/api/completion-contexts/[actionId]/route';
import { NextRequest } from 'next/server';
import { ActionsService } from '../../lib/services/actions';
import { CompletionContextService } from '../../lib/services/completion-context';

// Mock the services to avoid database dependencies
jest.mock('../../lib/services/actions');
jest.mock('../../lib/services/completion-context');

const mockedActionsService = ActionsService as jest.Mocked<typeof ActionsService>;
const mockedCompletionContextService = CompletionContextService as jest.Mocked<typeof CompletionContextService>;

describe('/api/completion-contexts', () => {
  const testActionId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockedActionsService.createAction.mockResolvedValue({
      action: {
        id: testActionId,
        data: { title: 'Test Action for API' },
        done: false,
        version: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      }
    });
  });

  describe('POST /api/completion-contexts', () => {
    it('should create completion context successfully', async () => {
      const mockCompletionContext = {
        actionId: testActionId,
        implementationStory: '**Built with TypeScript** and comprehensive testing',
        impactStory: 'Successfully created working API endpoints',
        learningStory: 'Learned about Next.js API route patterns',
        changelogVisibility: 'team' as const,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      mockedCompletionContextService.createCompletionContext.mockResolvedValue(mockCompletionContext);

      const requestBody = {
        actionId: testActionId,
        implementationStory: '**Built with TypeScript** and comprehensive testing',
        impactStory: 'Successfully created working API endpoints',
        learningStory: 'Learned about Next.js API route patterns',
        changelogVisibility: 'team'
      };

      const request = new NextRequest('http://localhost:3000/api/completion-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.actionId).toBe(testActionId);
      expect(data.data.implementationStory).toBe('**Built with TypeScript** and comprehensive testing');
    });

    it('should return error for invalid action ID', async () => {
      const requestBody = {
        actionId: 'invalid-uuid',
        implementationStory: 'Test story'
      };

      const request = new NextRequest('http://localhost:3000/api/completion-contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/completion-contexts', () => {
    beforeEach(() => {
      const mockCompletionContexts = [
        {
          actionId: testActionId,
          implementationStory: 'Test implementation',
          changelogVisibility: 'team' as const,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        }
      ];

      mockedCompletionContextService.listCompletionContexts.mockResolvedValue(mockCompletionContexts);
    });

    it('should list completion contexts', async () => {
      const request = new NextRequest('http://localhost:3000/api/completion-contexts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter by visibility', async () => {
      const request = new NextRequest('http://localhost:3000/api/completion-contexts?limit=20&offset=0&visibility=team');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/completion-contexts/[actionId]', () => {
    beforeEach(() => {
      const mockCompletionContext = {
        actionId: testActionId,
        implementationStory: 'Test implementation',
        impactStory: 'Test impact',
        changelogVisibility: 'team' as const,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      mockedCompletionContextService.getCompletionContext.mockImplementation(async (actionId) => {
        if (actionId === testActionId) {
          return mockCompletionContext;
        }
        return null;
      });
    });

    it('should get completion context by action ID', async () => {
      const request = new NextRequest(`http://localhost:3000/api/completion-contexts/${testActionId}`);
      const response = await GetById(request, { params: Promise.resolve({ actionId: testActionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.actionId).toBe(testActionId);
      expect(data.data.implementationStory).toBe('Test implementation');
    });

    it('should return 404 for non-existent completion context', async () => {
      const nonExistentActionId = 'ae85f2b3-1234-5678-9abc-def012345678';
      const request = new NextRequest(`http://localhost:3000/api/completion-contexts/${nonExistentActionId}`);
      const response = await GetById(request, { params: Promise.resolve({ actionId: nonExistentActionId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Completion context not found');
    });
  });

  describe('PUT /api/completion-contexts/[actionId]', () => {
    it('should update completion context', async () => {
      const updatedContext = {
        actionId: testActionId,
        implementationStory: 'Updated implementation story with **markdown**',
        impactStory: 'Updated impact story',
        changelogVisibility: 'public' as const,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      mockedCompletionContextService.upsertCompletionContext.mockResolvedValue(updatedContext);

      const updateBody = {
        implementationStory: 'Updated implementation story with **markdown**',
        impactStory: 'Updated impact story',
        changelogVisibility: 'public'
      };

      const request = new NextRequest(`http://localhost:3000/api/completion-contexts/${testActionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody)
      });

      const response = await PUT(request, { params: Promise.resolve({ actionId: testActionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.implementationStory).toBe('Updated implementation story with **markdown**');
      expect(data.data.changelogVisibility).toBe('public');
    });

    it('should return error when no update fields provided', async () => {
      const request = new NextRequest(`http://localhost:3000/api/completion-contexts/${testActionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await PUT(request, { params: Promise.resolve({ actionId: testActionId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('At least one field must be provided');
    });
  });

  describe('DELETE /api/completion-contexts/[actionId]', () => {
    beforeEach(() => {
      const mockDeletedContext = {
        actionId: testActionId,
        implementationStory: 'To be deleted',
        changelogVisibility: 'team' as const,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      mockedCompletionContextService.deleteCompletionContext.mockImplementation(async (actionId) => {
        if (actionId === testActionId) {
          return mockDeletedContext;
        }
        return null;
      });
    });

    it('should delete completion context', async () => {
      const request = new NextRequest(`http://localhost:3000/api/completion-contexts/${testActionId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: Promise.resolve({ actionId: testActionId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return 404 when trying to delete non-existent context', async () => {
      const nonExistentActionId = 'ae85f2b3-1234-5678-9abc-def012345678';
      const request = new NextRequest(`http://localhost:3000/api/completion-contexts/${nonExistentActionId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: Promise.resolve({ actionId: nonExistentActionId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Completion context not found');
    });
  });
});