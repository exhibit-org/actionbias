/**
 * Mock for @ai-sdk packages to avoid import issues in tests
 */

export const generateText = jest.fn().mockResolvedValue({
  text: 'Mock generated text',
  finishReason: 'stop',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30
  }
});

export const generateObject = jest.fn().mockResolvedValue({
  object: { 
    suggestion: 'Mock suggestion',
    confidence: 0.8 
  },
  finishReason: 'stop',
  usage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30
  }
});

export const embed = jest.fn().mockResolvedValue({
  embedding: Array(1536).fill(0).map(() => Math.random()),
  usage: {
    tokens: 10
  }
});

export const openai = jest.fn().mockReturnValue({
  generateText,
  generateObject,
  embed
});