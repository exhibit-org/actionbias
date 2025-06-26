import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EditorialAIService } from '@/lib/services/editorial-ai';
import { ActionsService } from '@/lib/services/actions';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const PreviewCompletionSchema = z.object({
  raw_input: z.string().default(''),
  changelog_visibility: z.enum(['private', 'team', 'public']).default('team'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const actionId = resolvedParams.id;
    const body = await request.json();

    // Validate input
    const validatedData = PreviewCompletionSchema.parse(body);

    // Fetch the action details
    const action = await ActionsService.getActionDetailResource(actionId);
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action not found' },
        { status: 404 }
      );
    }

    // First, generate the three stories from raw input + context
    const storiesPrompt = `You are helping complete an action in a project management system. Generate three completion stories based on the provided context and any user input.

Action Details:
- Title: ${action.title}
- Description: ${action.description || 'Not provided'}
- Vision: ${action.vision || 'Not provided'}
- Created: ${action.created_at}

${action.parent_chain && action.parent_chain.length > 0 ? `
Parent Action: ${action.parent_chain[0].title}
Parent Description: ${action.parent_chain[0].description || 'Not provided'}
` : ''}

${action.family_context_summary ? `
Family Context: ${action.family_context_summary}
` : ''}

${action.family_vision_summary ? `
Family Vision: ${action.family_vision_summary}
` : ''}

${action.dependencies && action.dependencies.length > 0 ? `
Dependencies (already completed):
${action.dependencies.map(dep => `- ${dep.title}: ${dep.done ? 'Completed' : 'In progress'}`).join('\n')}
` : ''}

${action.dependency_completion_context && action.dependency_completion_context.length > 0 ? `
Context from completed dependencies:
${action.dependency_completion_context.map(ctx => `- ${ctx.action_title}: ${ctx.impact_story || 'Completed'}`).join('\n')}
` : ''}

User Input: ${validatedData.raw_input || 'No input provided - generate a plausible completion based on the action details above.'}

Generate three stories in JSON format:
1. Implementation Story: HOW this was accomplished (specific technical details, tools used, challenges overcome)
2. Impact Story: WHAT was achieved (concrete outcomes, value delivered, who benefits)
3. Learning Story: WHAT was learned (insights gained, what would be done differently, advice for others)

Return ONLY valid JSON without any markdown formatting:
{
  "implementationStory": "...",
  "impactStory": "...",
  "learningStory": "..."
}`;

    let stories;
    try {
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: storiesPrompt,
        temperature: 0.7,
        maxTokens: 800,
      });

      // Parse the stories
      const cleanedText = result.text.trim()
        .replace(/^```json\n?/, '')
        .replace(/\n?```$/, '');
      
      stories = JSON.parse(cleanedText);
    } catch (error) {
      console.error('Failed to generate stories:', error);
      // Fallback to using raw input directly
      stories = {
        implementationStory: validatedData.raw_input || 'Completed the action successfully.',
        impactStory: validatedData.raw_input || 'Delivered value as intended.',
        learningStory: validatedData.raw_input || 'Gained valuable experience.',
      };
    }

    // Now generate editorial content from the stories
    const editorialContent = await EditorialAIService.generateEditorialContent({
      actionTitle: action.title,
      actionDescription: action.description || undefined,
      actionVision: action.vision || undefined,
      implementationStory: stories.implementationStory,
      impactStory: stories.impactStory,
      learningStory: stories.learningStory,
    });

    // Return preview data
    return NextResponse.json({
      success: true,
      data: {
        actionTitle: action.title,
        actionDescription: action.description,
        actionVision: action.vision,
        implementationStory: stories.implementationStory,
        impactStory: stories.impactStory,
        learningStory: stories.learningStory,
        changelogVisibility: validatedData.changelog_visibility,
        headline: editorialContent.headline,
        deck: editorialContent.deck,
        pullQuotes: editorialContent.pullQuotes,
        // Mock timestamp for preview
        completionTimestamp: new Date().toISOString(),
        actionCreatedAt: action.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error generating completion preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}