import { pgTable, uuid, text, jsonb, integer, primaryKey, timestamp, boolean, vector } from 'drizzle-orm/pg-core';
import { z } from 'zod';

// Zod schema for actions.data field
export const actionDataSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().describe("Detailed instructions or context describing how the action should be performed"),
  vision: z.string().optional().describe("A clear communication of the state of the world when the action is complete"),
});

export type ActionData = z.infer<typeof actionDataSchema>;

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
  structured_data: z.record(z.any()).optional(), // Future AI parsing/enhancement
  // Magazine-style editorial content (stored in structuredData)
  headline: z.string().optional(),              // AI-generated compelling headline
  deck: z.string().optional(),                  // AI-generated standfirst/subtitle
  pull_quotes: z.array(z.string()).optional(),  // AI-extracted key quotes
  // Git commit information
  git_commit_hash: z.string().optional(),       // SHA hash of the primary commit
  git_commit_message: z.string().optional(),    // Commit message  
  git_branch: z.string().optional(),            // Branch name where commit was made
  git_commit_author: z.string().optional(),     // Commit author (name <email>)
  git_commit_author_username: z.string().optional(), // GitHub username
  git_commit_timestamp: z.string().optional(),  // When the commit was made (ISO string)
  git_diff_stats: z.object({                    // Statistics about the changes
    filesChanged: z.number().optional(),
    insertions: z.number().optional(),
    deletions: z.number().optional(),
    files: z.array(z.string()).optional()
  }).optional(),
  git_related_commits: z.array(z.string()).optional() // Array of related commit hashes
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
  
  // Git commit information
  gitCommitHash: text('git_commit_hash'),           // SHA hash of the primary commit
  gitCommitMessage: text('git_commit_message'),     // Commit message
  gitBranch: text('git_branch'),                    // Branch name where commit was made
  gitCommitAuthor: text('git_commit_author'),       // Commit author (name <email>)
  gitCommitAuthorUsername: text('git_commit_author_username'), // GitHub username
  gitCommitTimestamp: timestamp('git_commit_timestamp'), // When the commit was made
  gitDiffStats: jsonb('git_diff_stats').$type<{    // Statistics about the changes
    filesChanged?: number;
    insertions?: number;
    deletions?: number;
    files?: string[];
  }>(),
  gitRelatedCommits: jsonb('git_related_commits').$type<string[]>(), // Array of related commit hashes
  
  // Metadata for changelog generation
  completionTimestamp: timestamp('completion_timestamp').defaultNow().notNull(),
  changelogVisibility: text('changelog_visibility').default('team').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Future flexibility
  structuredData: jsonb('structured_data')          // For future AI parsing/enhancement
});

// Waitlist table for email signups
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  source: text('source').default('homepage').notNull(), // Track where signup came from
  metadata: jsonb('metadata'), // JSON for any additional data
});