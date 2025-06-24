import { GET } from '../../app/api/actions/[id]/family-context/route';
import { ActionsService } from '../../lib/services/actions';

jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getFamilyContextSummary: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/[id]/family-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns synthesized description', async () => {
    mockedService.getFamilyContextSummary.mockResolvedValue('parent summary');

    const request = new Request('http://localhost/api/actions/123e4567-e89b-12d3-a456-426614174000/family-context');
    const response = await GET(request as any, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, data: { description: 'parent summary' } });
    expect(mockedService.getFamilyContextSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });

  it('handles service errors', async () => {
    mockedService.getFamilyContextSummary.mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/actions/456e7890-e89b-12d3-a456-426614174000/family-context');
    const response = await GET(request as any, { params: Promise.resolve({ id: '456e7890-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('boom');
  });
});
