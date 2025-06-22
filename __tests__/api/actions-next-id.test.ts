import { GET } from '../../app/api/actions/next/[id]/route';
import { ActionsService } from '../../lib/services/actions';

jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getNextActionScoped: jest.fn(),
    getActionDetailResource: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/next/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns next child action when one exists', async () => {
    const mockAction = {
      id: 'child-id',
      data: { title: 'Child Action' },
      done: false,
      version: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const mockDetails = {
      id: 'child-id',
      title: 'Child Action',
      done: false,
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      parent_id: 'parent-id',
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: [],
      parent_context_summary: 'context',
      parent_vision_summary: 'vision',
    };

    mockedService.getNextActionScoped.mockResolvedValue(mockAction as any);
    mockedService.getActionDetailResource.mockResolvedValue(mockDetails as any);

    const request = new Request('http://localhost/api/actions/next/parent-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'parent-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockDetails);
    expect(mockedService.getNextActionScoped).toHaveBeenCalledWith('parent-id');
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith('child-id');
  });

  it('returns null when no next child exists', async () => {
    mockedService.getNextActionScoped.mockResolvedValue(null);

    const request = new Request('http://localhost/api/actions/next/parent-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'parent-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBe(null);
    expect(mockedService.getNextActionScoped).toHaveBeenCalledWith('parent-id');
    expect(mockedService.getActionDetailResource).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    mockedService.getNextActionScoped.mockRejectedValue(new Error('DB failed'));

    const request = new Request('http://localhost/api/actions/next/parent-id');
    const response = await GET(request, { params: Promise.resolve({ id: 'parent-id' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('DB failed');
  });
});
