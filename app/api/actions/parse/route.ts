import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';

const parseRequestSchema = z.object({
  text: z.string().min(1).max(500),
});

const actionFieldsSchema = z.object({
  title: z.string().describe('A concise, action-oriented title (max 100 chars)'),
  description: z.string().describe('Detailed explanation of what needs to be done and why'),
  vision: z.string().describe('Clear description of the desired end state when this action is complete'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = parseRequestSchema.parse(body);

    // Use AI to parse the raw text into structured fields
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: actionFieldsSchema,
      prompt: `Parse this action request into structured fields. Be specific and action-oriented:

"${text}"

Guidelines:
- Title: Short, starts with a verb, clearly states the action
- Description: Expand on the title with context, requirements, and approach
- Vision: Describe what success looks like when this is done`,
    });

    return NextResponse.json({
      success: true,
      data: object,
    });
  } catch (error) {
    console.error('Error parsing action text:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid input',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to parse action text',
    }, { status: 500 });
  }
}