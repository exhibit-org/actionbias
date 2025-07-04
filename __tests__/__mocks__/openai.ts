/**
 * Mock for OpenAI SDK to avoid module resolution issues in tests
 */

const mockEmbedding = Array(1536).fill(0).map(() => Math.random());

export class OpenAI {
  embeddings = {
    create: jest.fn().mockResolvedValue({
      data: [{
        embedding: mockEmbedding,
        index: 0,
        object: 'embedding'
      }],
      model: 'text-embedding-3-small',
      object: 'list',
      usage: {
        prompt_tokens: 10,
        total_tokens: 10
      }
    })
  };

  chat = {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Mock AI response'
          },
          finish_reason: 'stop',
          index: 0
        }],
        created: Date.now(),
        id: 'mock-completion-id',
        model: 'gpt-4',
        object: 'chat.completion',
        usage: {
          completion_tokens: 10,
          prompt_tokens: 20,
          total_tokens: 30
        }
      })
    }
  };
}

export default OpenAI;