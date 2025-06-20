/**
 * OpenAI Embeddings service for generating vector representations of actions
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'test-key',
});

export interface EmbeddingInput {
  title: string;
  description?: string;
  vision?: string;
}

export class EmbeddingsService {
  /**
   * Generate embedding vector for action content
   * Combines title, description, and vision into optimized text for embedding
   */
  static async generateEmbedding(input: EmbeddingInput): Promise<number[]> {
    // Skip embedding generation in test environment
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      return new Array(1536).fill(0); // Return dummy vector for tests
    }

    const text = this.prepareTextForEmbedding(input);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple actions in batch
   * More efficient for processing multiple actions at once
   */
  static async generateBatchEmbeddings(inputs: EmbeddingInput[]): Promise<number[][]> {
    if (inputs.length === 0) return [];
    
    // Skip embedding generation in test environment
    if (process.env.NODE_ENV === 'test' || !process.env.OPENAI_API_KEY) {
      return inputs.map(() => new Array(1536).fill(0)); // Return dummy vectors for tests
    }
    
    const texts = inputs.map(input => this.prepareTextForEmbedding(input));
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Failed to generate batch embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare action content for optimal embedding generation
   * Combines and formats title, description, and vision fields
   */
  private static prepareTextForEmbedding(input: EmbeddingInput): string {
    const parts: string[] = [];
    
    // Title is always included and most important
    parts.push(input.title);
    
    // Add description if available
    if (input.description && input.description.trim()) {
      parts.push(input.description.trim());
    }
    
    // Add vision if available and different from description
    if (input.vision && input.vision.trim() && input.vision !== input.description) {
      parts.push(`Vision: ${input.vision.trim()}`);
    }
    
    return parts.join('\n\n');
  }

  /**
   * Test API connectivity and get model info
   */
  static async testConnection(): Promise<{
    success: boolean;
    model: string;
    dimensions: number;
  }> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'test connection',
        encoding_format: 'float',
      });
      
      return {
        success: true,
        model: 'text-embedding-3-small',
        dimensions: response.data[0].embedding.length
      };
    } catch (error) {
      console.error('OpenAI API connection test failed:', error);
      return {
        success: false,
        model: 'text-embedding-3-small',
        dimensions: 0
      };
    }
  }
}