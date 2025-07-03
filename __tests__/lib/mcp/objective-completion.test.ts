/**
 * @jest-environment jsdom
 */
import { z } from 'zod';

// Test for the new objective completion schema
describe('Objective Completion Schema', () => {
  
  // Define the new objective schema
  const ObjectiveCompletionSchema = z.object({
    action_id: z.string().uuid(),
    changelog_visibility: z.enum(["private", "team", "public"]),
    
    // Objective technical data (replaces implementation_story)
    technical_changes: z.object({
      files_modified: z.array(z.string()).default([]),
      files_created: z.array(z.string()).default([]),
      functions_added: z.array(z.string()).default([]),
      apis_modified: z.array(z.string()).default([]),
      dependencies_added: z.array(z.string()).default([]),
      config_changes: z.array(z.string()).default([]),
    }),
    
    // Objective outcomes (replaces impact_story)
    outcomes: z.object({
      features_implemented: z.array(z.string()).default([]),
      bugs_fixed: z.array(z.string()).default([]),
      performance_improvements: z.array(z.string()).default([]),
      tests_passing: z.boolean().optional(),
      build_status: z.enum(["success", "failed", "unknown"]).optional(),
    }),
    
    // Objective challenges (replaces learning_story)
    challenges: z.object({
      blockers_encountered: z.array(z.string()).default([]),
      blockers_resolved: z.array(z.string()).default([]),
      approaches_tried: z.array(z.string()).default([]),
      discoveries: z.array(z.string()).default([]),
    }),
    
    // Alignment reflection - agent's understanding of purpose fulfillment
    alignment_reflection: z.object({
      purpose_interpretation: z.string().describe("How the agent interpreted the action's goal/vision"),
      goal_achievement_assessment: z.string().describe("Agent's assessment of how well the goal was achieved"),
      context_influence: z.string().describe("How family/dependency context influenced the approach"),
      assumptions_made: z.array(z.string()).default([]).describe("Key assumptions made during implementation"),
    }),
    
    // Keep git_context as-is (already objective)
    git_context: z.object({
      commits: z.array(z.object({
        hash: z.string().optional(),
        shortHash: z.string().optional(),
        message: z.string(),
        author: z.object({
          name: z.string(),
          email: z.string().optional(),
          username: z.string().optional()
        }).optional(),
        timestamp: z.string().optional(),
        branch: z.string().optional(),
        repository: z.string().optional(),
        stats: z.object({
          filesChanged: z.number().optional(),
          insertions: z.number().optional(),
          deletions: z.number().optional(),
          files: z.array(z.string()).optional()
        }).optional()
      })).optional(),
      pullRequests: z.array(z.object({
        number: z.number().optional(),
        title: z.string(),
        url: z.string().optional(),
        repository: z.string().optional(),
        author: z.object({
          name: z.string().optional(),
          username: z.string().optional()
        }).optional(),
        state: z.enum(['open', 'closed', 'merged', 'draft']).optional(),
        merged: z.boolean().optional(),
        mergedAt: z.string().optional(),
        branch: z.object({
          head: z.string(),
          base: z.string()
        }).optional()
      })).optional(),
      repositories: z.array(z.object({
        name: z.string(),
        url: z.string().optional(),
        platform: z.enum(['github', 'gitlab', 'other']).optional()
      })).optional()
    }).optional(),
  });

  type ObjectiveCompletion = z.infer<typeof ObjectiveCompletionSchema>;

  it('should validate a complete objective completion', () => {
    const validCompletion: ObjectiveCompletion = {
      action_id: "123e4567-e89b-12d3-a456-426614174000",
      changelog_visibility: "team",
      technical_changes: {
        files_modified: ["/lib/services/actions.ts", "/db/schema.ts"],
        files_created: ["/api/new-endpoint/route.ts"],
        functions_added: ["createAction", "updateMetadata"],
        apis_modified: ["/api/actions", "/mcp/tools"],
        dependencies_added: ["zod@3.22.0", "@vercel/ai@2.1.0"],
        config_changes: ["Updated eslint.config.js", "Added new env var"],
      },
      outcomes: {
        features_implemented: ["User authentication", "File upload"],
        bugs_fixed: ["Memory leak in upload handler"],
        performance_improvements: ["Query speed improved 40%"],
        tests_passing: true,
        build_status: "success",
      },
      challenges: {
        blockers_encountered: ["TypeScript compilation errors"],
        blockers_resolved: ["Fixed import path issues"],
        approaches_tried: ["Tried Redis first, switched to PGlite"],
        discoveries: ["Found existing util function for validation"],
      },
      alignment_reflection: {
        purpose_interpretation: "Understood this as implementing secure user authentication with file upload capabilities to enable multi-user functionality",
        goal_achievement_assessment: "Successfully implemented both authentication and file upload features. All requirements met with good security practices.",
        context_influence: "Family context indicated this was part of user management system. Dependencies on database schema guided the authentication approach.",
        assumptions_made: ["Assumed JWT-based authentication was preferred", "Assumed file uploads needed virus scanning", "Assumed integration with existing database schema"],
      },
      git_context: {
        commits: [{
          message: "feat: implement new authentication system",
          author: { name: "Claude Code" },
          stats: { filesChanged: 5, insertions: 200, deletions: 10 }
        }]
      }
    };

    expect(() => ObjectiveCompletionSchema.parse(validCompletion)).not.toThrow();
  });

  it('should validate minimal objective completion', () => {
    const minimalCompletion: ObjectiveCompletion = {
      action_id: "123e4567-e89b-12d3-a456-426614174000",
      changelog_visibility: "private",
      technical_changes: {
        files_modified: [],
        files_created: [],
        functions_added: [],
        apis_modified: [],
        dependencies_added: [],
        config_changes: [],
      },
      outcomes: {
        features_implemented: [],
        bugs_fixed: [],
        performance_improvements: [],
      },
      challenges: {
        blockers_encountered: [],
        blockers_resolved: [],
        approaches_tried: [],
        discoveries: [],
      },
      alignment_reflection: {
        purpose_interpretation: "Basic task completion",
        goal_achievement_assessment: "Task completed as requested",
        context_influence: "No specific context influenced the approach",
        assumptions_made: [],
      },
    };

    expect(() => ObjectiveCompletionSchema.parse(minimalCompletion)).not.toThrow();
  });

  it('should reject invalid action_id', () => {
    const invalidCompletion = {
      action_id: "invalid-uuid",
      changelog_visibility: "team",
      technical_changes: {
        files_modified: [],
        files_created: [],
        functions_added: [],
        apis_modified: [],
        dependencies_added: [],
        config_changes: [],
      },
      outcomes: {
        features_implemented: [],
        bugs_fixed: [],
        performance_improvements: [],
      },
      challenges: {
        blockers_encountered: [],
        blockers_resolved: [],
        approaches_tried: [],
        discoveries: [],
      },
    };

    expect(() => ObjectiveCompletionSchema.parse(invalidCompletion)).toThrow();
  });

  // Test that the schema supports partial data entry
  it('should accept partial arrays in nested objects', () => {
    const partialCompletion = {
      action_id: "123e4567-e89b-12d3-a456-426614174000",
      changelog_visibility: "team" as const,
      technical_changes: {
        files_modified: ["/lib/test.ts"],
        files_created: [],
        functions_added: [],
        apis_modified: [],
        dependencies_added: [],
        config_changes: [],
      },
      outcomes: {
        features_implemented: ["New feature"],
        bugs_fixed: [],
        performance_improvements: [],
      },
      challenges: {
        blockers_encountered: [],
        blockers_resolved: [],
        approaches_tried: [],
        discoveries: [],
      },
    };

    expect(() => ObjectiveCompletionSchema.parse(partialCompletion)).not.toThrow();
  });
});