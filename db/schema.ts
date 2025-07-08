import { pgTable, uuid, text, jsonb, integer, primaryKey, timestamp, boolean, vector } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Zod schema for actions.data field
export const actionDataSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
  vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
});

export type ActionData = z.infer<typeof actionDataSchema>;

// Template content types for multiple audience views
export type TemplateContent = {
  engineering?: {
    headline?: string;
    deck?: string;
    implementation_story?: string;
    impact_story?: string;
    pull_quotes?: string[];
    importance?: 'high' | 'medium' | 'low';
  };
  business?: {
    headline?: string;
    deck?: string;
    impact_story?: string;
    strategic_implications?: string;
    pull_quotes?: string[];
    importance?: 'high' | 'medium' | 'low';
  };
  customer?: {
    headline?: string;
    announcement?: string;
    feature_highlights?: string;
    user_benefits?: string;
    pull_quotes?: string[];
    importance?: 'high' | 'medium' | 'low';
  };
};

export const actions = pgTable('actions', {
  id: uuid('id').primaryKey(),
  data: jsonb('data').$type<ActionData>(),
  done: boolean('done').default(false).notNull(),
  version: integer('version').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Core action fields (extracted from JSON for better performance and indexing)
  title: text('title'),
  description: text('description'),
  vision: text('vision'),
  // Semantic fields for AI-powered action management
  embeddingVector: vector('embedding_vector', { dimensions: 1536 }), // OpenAI embedding dimensions
  nodeSummary: text('node_summary'),
  subtreeSummary: text('subtree_summary'),
  familyContextSummary: text('family_context_summary'),
  familyVisionSummary: text('family_vision_summary'),
});

export const edges = pgTable('edges', {
  src: uuid('src').references(() => actions.id, { onDelete: 'cascade' }),
  dst: uuid('dst').references(() => actions.id, { onDelete: 'cascade' }),
  kind: text('kind'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.src, table.dst, table.kind] }),
}));

// Simple Completion Context Schema for Prototype
export const completionContextSchema = z.object({
  implementation_story: z.string().optional(),  // "How did you build this?" (supports markdown)
  impact_story: z.string().optional(),          // "What did you accomplish?" (supports markdown)
  learning_story: z.string().optional(),        // "What did you learn?" (supports markdown)
  // Magazine-style editorial content
  headline: z.string().optional(),              // AI-generated compelling headline
  deck: z.string().optional(),                  // AI-generated standfirst/subtitle
  pull_quotes: z.array(z.string()).optional(),  // AI-extracted key quotes
  // Git context - flexible structure for commits, PRs, and repositories
  git_context: z.object({
    commits: z.array(z.object({
      hash: z.string().optional(),               // SHA hash (optional - might not know yet)
      shortHash: z.string().optional(),          // Short SHA (7 chars)
      message: z.string(),                       // Commit message (required)
      author: z.object({                         // Author information
        name: z.string(),
        email: z.string().optional(),
        username: z.string().optional()         // GitHub username
      }).optional(),
      timestamp: z.string().optional(),          // ISO timestamp
      branch: z.string().optional(),             // Branch name
      repository: z.string().optional(),         // Repository name/URL
      stats: z.object({                          // Diff statistics
        filesChanged: z.number().optional(),
        insertions: z.number().optional(),
        deletions: z.number().optional(),
        files: z.array(z.string()).optional()
      }).optional()
    })).optional(),
    pullRequests: z.array(z.object({
      number: z.number().optional(),             // PR number (optional - might not exist yet)
      title: z.string(),                         // PR title (required)
      url: z.string().optional(),                // Full PR URL
      repository: z.string().optional(),         // Repository name/URL
      author: z.object({                         // PR author
        name: z.string().optional(),
        username: z.string().optional()
      }).optional(),
      state: z.enum(['open', 'closed', 'merged', 'draft']).optional(),
      merged: z.boolean().optional(),
      mergedAt: z.string().optional(),           // ISO timestamp
      branch: z.object({                         // Branch information
        head: z.string(),                        // Source branch
        base: z.string()                         // Target branch
      }).optional()
    })).optional(),
    repositories: z.array(z.object({             // Repositories involved
      name: z.string(),
      url: z.string().optional(),
      platform: z.enum(['github', 'gitlab', 'other']).optional()
    })).optional()
  }).optional()
});

export type CompletionContext = z.infer<typeof completionContextSchema>;

export const completionContexts = pgTable('completion_contexts', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionId: uuid('action_id').notNull().references(() => actions.id, { onDelete: 'cascade' }),
  
  // Simple, flexible story capture (supports markdown formatting)
  implementationStory: text('implementation_story'), // "How did you build this?"
  impactStory: text('impact_story'),                 // "What did you accomplish?"
  learningStory: text('learning_story'),             // "What did you learn?"
  
  // Magazine-style editorial content
  headline: text('headline'),                        // AI-generated compelling headline
  deck: text('deck'),                                // AI-generated standfirst/subtitle
  pullQuotes: jsonb('pull_quotes').$type<string[]>(), // AI-extracted key quotes
  
  // Git context - flexible structure for commits, PRs, and repositories
  gitContext: jsonb('git_context').$type<{
    commits?: Array<{
      hash?: string;              // SHA hash (optional - might not know yet)
      shortHash?: string;         // Short SHA (7 chars)
      message: string;            // Commit message (required)
      author?: {                  // Author information
        name: string;
        email?: string;
        username?: string;        // GitHub username
      };
      timestamp?: string;         // ISO timestamp
      branch?: string;            // Branch name
      repository?: string;        // Repository name/URL
      stats?: {                   // Diff statistics
        filesChanged?: number;
        insertions?: number;
        deletions?: number;
        files?: string[];
      };
    }>;
    pullRequests?: Array<{
      number?: number;            // PR number (optional - might not exist yet)
      title: string;              // PR title (required)
      url?: string;               // Full PR URL
      repository?: string;        // Repository name/URL
      author?: {                  // PR author
        name?: string;
        username?: string;
      };
      state?: 'open' | 'closed' | 'merged' | 'draft';
      merged?: boolean;
      mergedAt?: string;          // ISO timestamp
      branch?: {                  // Branch information
        head: string;             // Source branch
        base: string;             // Target branch
      };
    }>;
    repositories?: Array<{        // Repositories involved
      name: string;
      url?: string;
      platform?: 'github' | 'gitlab' | 'other';
    }>;
  }>(),
  
  // Template-specific content storage for multiple audience views
  templateContent: jsonb('template_content').$type<TemplateContent>(),
  
  // Phase 3: Objective completion data
  technicalChanges: jsonb('technical_changes').$type<{
    files_modified?: string[];
    files_created?: string[];
    functions_added?: string[];
    apis_modified?: string[];
    dependencies_added?: string[];
    config_changes?: string[];
  }>(),

  outcomes: jsonb('outcomes').$type<{
    features_implemented?: string[];
    bugs_fixed?: string[];
    performance_improvements?: string[];
    tests_passing?: boolean;
    build_status?: 'success' | 'failed' | 'unknown';
  }>(),

  challenges: jsonb('challenges').$type<{
    blockers_encountered?: string[];
    blockers_resolved?: string[];
    approaches_tried?: string[];
    discoveries?: string[];
  }>(),

  alignmentReflection: jsonb('alignment_reflection').$type<{
    purpose_interpretation?: string;
    goal_achievement_assessment?: string;
    context_influence?: string;
    assumptions_made?: string[];
  }>(),
  
  // Metadata for changelog generation
  completionTimestamp: timestamp('completion_timestamp').defaultNow().notNull(),
  changelogVisibility: text('changelog_visibility').default('team').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Waitlist table for email signups
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  source: text('source').default('homepage').notNull(), // Track where signup came from
  metadata: jsonb('metadata'), // JSON for any additional data
});

// Work log for agent activity and collaboration tracking
export const workLog = pgTable('work_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(), // Rich narrative: "Claimed action X, discovered it depends on Y and Z, moved X under parent P"
  metadata: jsonb('metadata'), // Flexible data: action IDs, agent info, whatever makes sense
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});