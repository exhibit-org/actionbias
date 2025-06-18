import { GET } from '../../app/api/actions/next/route';
import { ActionsService } from '../../lib/services/actions';

// Mock the ActionsService
jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getNextAction: jest.fn(),
    getActionDetailResource: jest.fn(),
    getParentContextSummary: jest.fn(),
    getParentVisionSummary: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/next', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns next action with details when action exists', async () => {
    const mockAction = {
      id: 'test-action-id',
      data: {
        title: 'Test Action',
        description: 'Test description'
      },
      done: false,
      version: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };

    const mockActionDetails = {
      id: 'test-action-id',
      title: 'Test Action',
      description: 'Test description',
      vision: 'Test vision',
      done: false,
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      parent_id: null,
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: []
    };

    mockedService.getNextAction.mockResolvedValue(mockAction);
    mockedService.getActionDetailResource.mockResolvedValue(mockActionDetails);
    mockedService.getParentContextSummary.mockResolvedValue('Test parent context summary');
    mockedService.getParentVisionSummary.mockResolvedValue('Test parent vision summary');

    const request = new Request('http://localhost:3000/api/actions/next');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      ...mockActionDetails,
      parent_context_summary: 'Test parent context summary',
      parent_vision_summary: 'Test parent vision summary'
    });
    expect(mockedService.getNextAction).toHaveBeenCalled();
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith('test-action-id');
    expect(mockedService.getParentContextSummary).toHaveBeenCalledWith('test-action-id');
    expect(mockedService.getParentVisionSummary).toHaveBeenCalledWith('test-action-id');
  });

  it('returns null when no next action exists', async () => {
    mockedService.getNextAction.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/actions/next');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBe(null);
    expect(mockedService.getNextAction).toHaveBeenCalled();
    expect(mockedService.getActionDetailResource).not.toHaveBeenCalled();
  });

  it('returns 500 error when getNextAction throws', async () => {
    mockedService.getNextAction.mockRejectedValue(new Error('Database connection failed'));

    const request = new Request('http://localhost:3000/api/actions/next');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database connection failed');
  });

  it('returns 500 error when getActionDetailResource throws', async () => {
    const mockAction = {
      id: 'test-action-id',
      data: {
        title: 'Test Action'
      },
      done: false,
      version: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };

    mockedService.getNextAction.mockResolvedValue(mockAction);
    mockedService.getActionDetailResource.mockRejectedValue(new Error('Action not found'));

    const request = new Request('http://localhost:3000/api/actions/next');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Action not found');
  });

  it('handles unknown errors gracefully', async () => {
    mockedService.getNextAction.mockRejectedValue('String error');

    const request = new Request('http://localhost:3000/api/actions/next');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unknown error');
  });
});