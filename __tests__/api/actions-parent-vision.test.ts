import { GET } from '../../app/api/actions/[id]/family-vision/route';
import { ActionsService } from '../../lib/services/actions';

jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getFamilyVisionSummary: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/[id]/family-vision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns synthesized vision', async () => {
    mockedService.getFamilyVisionSummary.mockResolvedValue('parent vision');

    const request = new Request('http://localhost/api/actions/abc/family-vision');
    const response = await GET(request as any, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, data: { vision: 'parent vision' } });
    expect(mockedService.getFamilyVisionSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });

  it('handles service errors', async () => {
    mockedService.getFamilyVisionSummary.mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/actions/abc/family-vision');
    const response = await GET(request as any, { params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('boom');
  });
});
