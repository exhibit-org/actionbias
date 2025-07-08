/**
 * Mock for @ai-sdk/openai package
 */

export const openai = jest.fn().mockReturnValue({
  generateText: jest.fn().mockResolvedValue({
    text: 'Mock generated text',
    finishReason: 'stop',
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30
    }
  }),
  generateObject: jest.fn().mockResolvedValue({
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
  }),
  embed: jest.fn().mockResolvedValue({
    embedding: Array(1536).fill(0).map(() => Math.random()),
    usage: {
      tokens: 10
    }
  })
});