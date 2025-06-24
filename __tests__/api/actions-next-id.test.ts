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
      id: '456e7890-e89b-12d3-a456-426614174111',
      data: { title: 'Child Action' },
      done: false,
      version: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const mockDetails = {
      id: '456e7890-e89b-12d3-a456-426614174111',
      title: 'Child Action',
      done: false,
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      parent_id: '123e4567-e89b-12d3-a456-426614174000',
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: [],
      family_context_summary: 'context',
      family_vision_summary: 'vision',
    };

    mockedService.getNextActionScoped.mockResolvedValue(mockAction as any);
    mockedService.getActionDetailResource.mockResolvedValue(mockDetails as any);

    const request = new Request('http://localhost/api/actions/next/parent-id');
    const response = await GET(request, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockDetails);
    expect(mockedService.getNextActionScoped).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith('456e7890-e89b-12d3-a456-426614174111');
  });

  it('returns null when no next child exists', async () => {
    mockedService.getNextActionScoped.mockResolvedValue(null);

    const request = new Request('http://localhost/api/actions/next/parent-id');
    const response = await GET(request, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBe(null);
    expect(mockedService.getNextActionScoped).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockedService.getActionDetailResource).not.toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    mockedService.getNextActionScoped.mockRejectedValue(new Error('DB failed'));

    const request = new Request('http://localhost/api/actions/next/parent-id');
    const response = await GET(request, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('DB failed');
  });
});
