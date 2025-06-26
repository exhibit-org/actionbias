import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EditorialAIService } from '@/lib/services/editorial-ai';
import { ActionsService } from '@/lib/services/actions';

const PreviewCompletionSchema = z.object({
  implementation_story: z.string().min(1),
  impact_story: z.string().min(1),
  learning_story: z.string().min(1),
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

    // Generate editorial content preview
    const editorialContent = await EditorialAIService.generateEditorialContent({
      actionTitle: action.title,
      actionDescription: action.description || undefined,
      actionVision: action.vision || undefined,
      implementationStory: validatedData.implementation_story,
      impactStory: validatedData.impact_story,
      learningStory: validatedData.learning_story,
    });

    // Return preview data
    return NextResponse.json({
      success: true,
      data: {
        actionTitle: action.title,
        actionDescription: action.description,
        actionVision: action.vision,
        implementationStory: validatedData.implementation_story,
        impactStory: validatedData.impact_story,
        learningStory: validatedData.learning_story,
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