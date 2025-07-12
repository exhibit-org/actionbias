import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ActionsService } from "../../../../../lib/services/actions";

// Unified schema supporting both user-friendly stories and structured MCP data
const completeActionSchema = z.object({
  // Legacy story format (for user interface)
  implementation_story: z.string().optional(),
  impact_story: z.string().optional(), 
  learning_story: z.string().optional(),
  
  // New structured format (for MCP tools)
  technical_changes: z.object({
    files_modified: z.array(z.string()).default([]),
    files_created: z.array(z.string()).default([]),
    functions_added: z.array(z.string()).default([]),
    apis_modified: z.array(z.string()).default([]),
    dependencies_added: z.array(z.string()).default([]),
    config_changes: z.array(z.string()).default([]),
  }).optional(),
  
  outcomes: z.object({
    features_implemented: z.array(z.string()).default([]),
    bugs_fixed: z.array(z.string()).default([]),
    performance_improvements: z.array(z.string()).default([]),
    tests_passing: z.boolean().optional(),
    build_status: z.enum(["success", "failed", "unknown"]).optional(),
  }).optional(),
  
  challenges: z.object({
    blockers_encountered: z.array(z.string()).default([]),
    blockers_resolved: z.array(z.string()).default([]),
    approaches_tried: z.array(z.string()).default([]),
    discoveries: z.array(z.string()).default([]),
  }).optional(),
  
  alignment_reflection: z.object({
    purpose_interpretation: z.string(),
    goal_achievement_assessment: z.string(),
    context_influence: z.string(),
    assumptions_made: z.array(z.string()).default([]),
  }).optional(),
  
  git_context: z.object({
    commits: z.array(z.object({
      message: z.string(),
      author: z.object({
        name: z.string(),
        email: z.string().optional(),
        username: z.string().optional(),
      }),
      hash: z.string().optional(),
      shortHash: z.string().optional(),
      timestamp: z.string().optional(),
      branch: z.string().optional(),
      repository: z.string().optional(),
      stats: z.object({
        filesChanged: z.number().optional(),
        insertions: z.number().optional(),
        deletions: z.number().optional(),
        files: z.array(z.string()).optional(),
      }).optional(),
    })).optional(),
    pullRequests: z.array(z.object({
      title: z.string(),
      number: z.number().optional(),
      state: z.enum(["open", "closed", "merged", "draft"]).optional(),
      branch: z.object({
        head: z.string(),
        base: z.string(),
      }).optional(),
      author: z.object({
        name: z.string().optional(),
        username: z.string().optional(),
      }).optional(),
      url: z.string().optional(),
      repository: z.string().optional(),
      merged: z.boolean().optional(),
      mergedAt: z.string().optional(),
    })).optional(),
    repositories: z.array(z.object({
      name: z.string(),
      url: z.string().optional(),
      platform: z.enum(["github", "gitlab", "other"]).optional(),
    })).optional(),
  }).optional(),
  
  changelog_visibility: z.enum(["private", "team", "public"]).default("team"),
}).refine((data) => {
  // Either stories are provided OR structured data is provided
  const hasStories = data.implementation_story && data.impact_story && data.learning_story;
  const hasStructuredData = data.technical_changes || data.outcomes || data.challenges || data.alignment_reflection;
  
  return hasStories || hasStructuredData;
}, {
  message: "Either provide implementation_story, impact_story, and learning_story OR provide structured completion data (technical_changes, outcomes, challenges, alignment_reflection)",
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const completeParams = completeActionSchema.parse(body);
    const resolvedParams = await params;
    const actionId = resolvedParams.id;
    
    // Validate that the ID looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(actionId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action ID format: "${actionId}". Expected a UUID.`
        },
        { status: 400 }
      );
    }
    
    const result = await ActionsService.updateAction({
      action_id: actionId,
      done: true,
      completion_context: completeParams
    });
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Action completed successfully with completion context"
    });
  } catch (error) {
    console.error('Error completing action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}