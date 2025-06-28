import { registerPrompts, promptCapabilities } from '../../../lib/mcp/prompts';
import { ActionsService } from '../../../lib/services/actions';

jest.mock('../../../lib/services/actions');

const mockServer = {
  prompt: jest.fn(),
};

describe('MCP Prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServer.prompt.mockClear();
  });

  describe('registerPrompts', () => {
    it('should register prompts with the server', () => {
      registerPrompts(mockServer as any);
      expect(mockServer.prompt).toHaveBeenCalledTimes(10);
      expect(mockServer.prompt).toHaveBeenCalledWith(
        'claude-code-next-action',
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('promptCapabilities', () => {
    it('should export correct prompt capabilities', () => {
      expect(promptCapabilities).toHaveProperty('claude-code-next-action');
      expect(promptCapabilities['claude-code-next-action'].description).toBe(
        'Structured prompt summarizing an action with context'
      );
    });
  });
});
