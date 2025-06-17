import { GET } from '../../app/api/actions/[id]/full-context/route';
import { ActionsService } from '../../lib/services/actions';

jest.mock('../../lib/services/actions', () => ({
  ActionsService: {
    getFullContextDescription: jest.fn(),
  },
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;

describe('/api/actions/[id]/full-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns synthesized description', async () => {
    mockedService.getFullContextDescription.mockResolvedValue('full desc');

    const request = new Request('http://localhost/api/actions/abc/full-context');
    const response = await GET(request as any, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, data: { description: 'full desc' } });
    expect(mockedService.getFullContextDescription).toHaveBeenCalledWith('abc');
  });

  it('handles service errors', async () => {
    mockedService.getFullContextDescription.mockRejectedValue(new Error('boom'));

    const request = new Request('http://localhost/api/actions/abc/full-context');
    const response = await GET(request as any, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('boom');
  });
});
