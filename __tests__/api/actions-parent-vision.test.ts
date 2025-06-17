import { GET } from '../../app/api/actions/[id]/parent-vision/route';
import { ActionsService } from '../../lib/services/actions';

jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getParentVisionSummary: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/[id]/parent-vision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns synthesized vision', async () => {
    mockedService.getParentVisionSummary.mockResolvedValue('parent vision');

    const request = new Request('http://localhost/api/actions/abc/parent-vision');
    const response = await GET(request as any, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, data: { vision: 'parent vision' } });
    expect(mockedService.getParentVisionSummary).toHaveBeenCalledWith('abc');
  });

  it('handles service errors', async () => {
    mockedService.getParentVisionSummary.mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/actions/abc/parent-vision');
    const response = await GET(request as any, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('boom');
  });
});
