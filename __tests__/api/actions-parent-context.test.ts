import { GET } from '../../app/api/actions/[id]/parent-context/route';
import { ActionsService } from '../../lib/services/actions';

jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getParentContextSummary: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/[id]/parent-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns synthesized description', async () => {
    mockedService.getParentContextSummary.mockResolvedValue('parent summary');

    const request = new Request('http://localhost/api/actions/abc/parent-context');
    const response = await GET(request as any, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, data: { description: 'parent summary' } });
    expect(mockedService.getParentContextSummary).toHaveBeenCalledWith('abc');
  });

  it('handles service errors', async () => {
    mockedService.getParentContextSummary.mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/actions/abc/parent-context');
    const response = await GET(request as any, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('boom');
  });
});
