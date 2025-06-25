import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface EditorialContent {
  headline?: string;
  deck?: string;
  pullQuotes?: string[];
}

export interface GenerateEditorialParams {
  actionTitle: string;
  actionDescription?: string;
  actionVision?: string;
  implementationStory: string;
  impactStory: string;
  learningStory: string;
}

export class EditorialAIService {
  /**
   * Generate magazine-style editorial content from completion stories
   */
  static async generateEditorialContent(params: GenerateEditorialParams): Promise<EditorialContent> {
    const { 
      actionTitle, 
      actionDescription, 
      actionVision,
      implementationStory, 
      impactStory, 
      learningStory 
    } = params;

    try {
      const prompt = `You are an expert tech journalist creating compelling magazine-style content from engineering completion stories.

Given this completed action:
Title: ${actionTitle}
${actionDescription ? `Description: ${actionDescription}` : ''}
${actionVision ? `Vision: ${actionVision}` : ''}

Implementation Story: ${implementationStory}

Impact Story: ${impactStory}

Learning Story: ${learningStory}

Generate the following editorial content:

1. HEADLINE: A compelling, specific headline that captures the achievement (10-15 words max). Focus on the impact and make it newsworthy. Examples:
- "Revolutionary Search Architecture Cuts Query Time by 70%"
- "AI-Powered Code Analysis Eliminates 90% of Manual Reviews"
- "New Caching Strategy Saves $50K Monthly in Infrastructure Costs"

2. DECK: A 2-3 sentence standfirst that expands on the headline and hooks the reader. This should provide context and make them want to read more.

3. PULL QUOTES: Extract 2-3 powerful quotes from the stories that highlight key achievements, insights, or turning points. These should be impactful statements that work well when highlighted.

Return the content in JSON format:
{
  "headline": "...",
  "deck": "...",
  "pullQuotes": ["quote1", "quote2", "quote3"]
}`;

      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      // Parse the JSON response
      try {
        const content = JSON.parse(result.text);
        return {
          headline: content.headline,
          deck: content.deck,
          pullQuotes: content.pullQuotes || [],
        };
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback: Try to extract content from the text
        return this.extractContentFromText(result.text);
      }
    } catch (error) {
      console.error('Failed to generate editorial content:', error);
      // Return empty content on error
      return {};
    }
  }

  /**
   * Fallback method to extract content from non-JSON responses
   */
  private static extractContentFromText(text: string): EditorialContent {
    const content: EditorialContent = {};

    // Try to extract headline
    const headlineMatch = text.match(/headline[:\s]*["']?([^"'\n]+)["']?/i);
    if (headlineMatch) {
      content.headline = headlineMatch[1].trim();
    }

    // Try to extract deck
    const deckMatch = text.match(/deck[:\s]*["']?([^"'\n]+(?:\n[^"'\n]+)?)["']?/i);
    if (deckMatch) {
      content.deck = deckMatch[1].trim();
    }

    // Try to extract pull quotes
    const quotesMatch = text.match(/pull quotes?[:\s]*\[([^\]]+)\]/i);
    if (quotesMatch) {
      content.pullQuotes = quotesMatch[1]
        .split(',')
        .map(q => q.trim().replace(/["']/g, ''))
        .filter(q => q.length > 0);
    }

    return content;
  }

  /**
   * Generate a headline from action and completion data
   */
  static async generateHeadline(
    actionTitle: string, 
    impactStory: string
  ): Promise<string | undefined> {
    try {
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Create a compelling magazine-style headline (10-15 words) for this engineering achievement:
Action: ${actionTitle}
Impact: ${impactStory}

Focus on specific outcomes and make it newsworthy. Return only the headline, no quotes or explanation.`,
        temperature: 0.7,
        maxTokens: 50,
      });

      return result.text.trim();
    } catch (error) {
      console.error('Failed to generate headline:', error);
      return undefined;
    }
  }
}