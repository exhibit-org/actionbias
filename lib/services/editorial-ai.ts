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
  // Additional context
  nodeSummary?: string;
  subtreeSummary?: string;
  familyContextSummary?: string;
  familyVisionSummary?: string;
  dependencyCompletions?: Array<{
    title: string;
    impactStory?: string;
  }>;
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
      learningStory,
      nodeSummary,
      subtreeSummary,
      familyContextSummary,
      familyVisionSummary,
      dependencyCompletions
    } = params;

    try {
      const prompt = `You are an expert tech journalist creating compelling magazine-style content from engineering completion stories.

Given this completed action:
Title: ${actionTitle}
${actionDescription ? `Description: ${actionDescription}` : ''}
${actionVision ? `Vision: ${actionVision}` : ''}

${nodeSummary ? `Action Summary: ${nodeSummary}\n` : ''}
${subtreeSummary ? `Subtree Context: ${subtreeSummary}\n` : ''}
${familyContextSummary ? `Family Context: ${familyContextSummary}\n` : ''}
${familyVisionSummary ? `Family Vision: ${familyVisionSummary}\n` : ''}

${dependencyCompletions && dependencyCompletions.length > 0 ? `
Building on these completed dependencies:
${dependencyCompletions.map(dep => `- ${dep.title}: ${dep.impactStory || 'Completed'}`).join('\n')}
` : ''}

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

Return ONLY valid JSON without any markdown formatting or code blocks. The response should be pure JSON that can be parsed directly:
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
        // Clean up the response - remove markdown code blocks if present
        let cleanedText = result.text.trim();
        
        // Remove markdown code block markers
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.substring(7);
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.substring(3);
        }
        
        if (cleanedText.endsWith('```')) {
          cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
        
        cleanedText = cleanedText.trim();
        
        const content = JSON.parse(cleanedText);
        return {
          headline: content.headline,
          deck: content.deck,
          pullQuotes: content.pullQuotes || [],
        };
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Raw response:', result.text);
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

    // Try to extract headline - improved regex to avoid capturing just ":"
    const headlineMatch = text.match(/headline[:\s]*["']?([^"'\n]{5,})["']?/i);
    if (headlineMatch) {
      const headline = headlineMatch[1].trim();
      // Only set if it's meaningful content (not just punctuation)
      if (headline.length > 5 && !/^[:\s]+$/.test(headline)) {
        content.headline = headline;
      }
    }

    // Try to extract deck - improved regex
    const deckMatch = text.match(/deck[:\s]*["']?([^"'\n]{10,}(?:\n[^"'\n]+)?)["']?/i);
    if (deckMatch) {
      const deck = deckMatch[1].trim();
      // Only set if it's meaningful content
      if (deck.length > 10 && !/^[:\s]+$/.test(deck)) {
        content.deck = deck;
      }
    }

    // Try to extract pull quotes with better validation
    const quotesMatch = text.match(/pull quotes?[:\s]*\[([^\]]+)\]/i);
    if (quotesMatch) {
      const quotes = quotesMatch[1]
        .split(',')
        .map(q => q.trim().replace(/["']/g, ''))
        .filter(q => q.length > 10); // Only keep meaningful quotes
      
      if (quotes.length > 0) {
        content.pullQuotes = quotes;
      }
    }

    // If extraction failed, return empty object instead of malformed data
    if (Object.keys(content).length === 0 || 
        content.headline === ':' || 
        content.deck === ':') {
      console.warn('Failed to extract meaningful content from text:', text.substring(0, 200));
      return {};
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